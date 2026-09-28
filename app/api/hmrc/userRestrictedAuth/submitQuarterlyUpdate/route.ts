import { HMRC_CONFIG } from '@/config/hmrc';
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildFraudPreventionHeaders } from '../../../utils/buildFraudPreventionHeaders';

const incomeFields = ['turnover', 'other', 'taxTakenOffTradingIncome'] as const;
const expenseFields = [
  'costOfGoods',
  'paymentsToSubcontractors',
  'wagesAndStaffCosts',
  'carVanTravelExpenses',
  'premisesRunningCosts',
  'maintenanceCosts',
  'adminCosts',
  'businessEntertainmentCosts',
  'advertisingCosts',
  'interestOnBankOtherLoans',
  'financeCharges',
  'irrecoverableDebts',
  'professionalFees',
  'depreciation',
  'otherExpenses',
] as const;
const disallowableExpenseFields = expenseFields.map((field) => `${field}Disallowable`);

type NumericObject = Record<string, number>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readAmounts(value: unknown, fields: readonly string[]): NumericObject | undefined {
  if (!isRecord(value)) return undefined;

  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key))) return undefined;

  const amounts: NumericObject = {};
  for (const field of fields) {
    const amount = value[field];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return undefined;
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) return undefined;
    amounts[field] = amount;
  }
  return amounts;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function taxYearForDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const startYear = month > 4 || (month === 4 && day >= 6) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function hmrcErrorMessage(body: unknown) {
  if (isRecord(body) && typeof body.message === 'string') return body.message;
  return 'HMRC quarterly update submission failed';
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  if (!isRecord(input)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { clientData, nino, businessId, taxYear, periodStartDate, periodEndDate } = input;
  if (typeof nino !== 'string' || !/^[A-Z]{2}\d{6}[A-D]$/.test(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (typeof businessId !== 'string' || !/^X[A-Z0-9]IS\d{11}$/.test(businessId)) {
    return NextResponse.json({ error: 'A valid HMRC business ID is required' }, { status: 400 });
  }
  if (!isIsoDate(periodStartDate) || !isIsoDate(periodEndDate) || periodStartDate > periodEndDate) {
    return NextResponse.json({ error: 'A valid reporting period is required' }, { status: 400 });
  }
  if (typeof taxYear !== 'string' || taxYear !== taxYearForDate(periodEndDate)) {
    return NextResponse.json({ error: 'The tax year does not match the reporting period' }, { status: 400 });
  }

  const periodIncome = readAmounts(input.periodIncome, incomeFields);
  if (!periodIncome) {
    return NextResponse.json({ error: 'Income must include valid turnover, other income, and tax deducted amounts' }, { status: 400 });
  }

  const rawExpenses = input.periodExpenses;
  const usesConsolidatedExpenses = isRecord(rawExpenses) && Object.keys(rawExpenses).length === 1 && 'consolidatedExpenses' in rawExpenses;
  const periodExpenses = usesConsolidatedExpenses
    ? readAmounts(rawExpenses, ['consolidatedExpenses'])
    : readAmounts(rawExpenses, expenseFields);
  if (!periodExpenses) {
    return NextResponse.json({ error: 'Expenses must contain consolidated expenses or all itemised expense categories' }, { status: 400 });
  }
  const periodDisallowableExpenses = usesConsolidatedExpenses
    ? undefined
    : readAmounts(input.periodDisallowableExpenses, disallowableExpenseFields);
  if (!usesConsolidatedExpenses && !periodDisallowableExpenses) {
    return NextResponse.json({ error: 'All disallowable expense categories must be supplied, using zero when not applicable' }, { status: 400 });
  }

  if (Number(taxYear.slice(0, 4)) >= 2025 && periodStartDate !== `${taxYear.slice(0, 4)}-04-06`) {
    return NextResponse.json({ error: 'Cumulative updates must start at the beginning of the tax year' }, { status: 400 });
  }

  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData);
  const cookieStore = await cookies();
  let token = cookieStore.get('access_token')?.value;

  if (!token && !cookieStore.has('access_token')) {
    const tokenResult = await requestUserAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json({ status: tokenResult.status, body: tokenResult.body }, { status: tokenResult.status });
    }

    const options = {
      httpOnly: true,
      maxAge: tokenResult.tokens.expires_in,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    cookieStore.set('access_token', tokenResult.tokens.access_token, options);
    if (tokenResult.tokens.refresh_token) {
      cookieStore.set('refresh_token', tokenResult.tokens.refresh_token, options);
    }
    token = tokenResult.tokens.access_token;
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
  }

  const isCumulative = Number(taxYear.slice(0, 4)) >= 2025;
  const endpoint = isCumulative
    ? `/individuals/business/self-employment/${nino}/${businessId}/cumulative/${taxYear}`
    : `/individuals/business/self-employment/${nino}/${businessId}/period`;
  const payload = {
    periodDates: { periodStartDate, periodEndDate },
    periodIncome,
    periodExpenses,
    ...(periodDisallowableExpenses && { periodDisallowableExpenses }),
  };

  try {
    const hmrcResponse = await fetch(`${HMRC_CONFIG.testApiUrl}${endpoint}`, {
      method: isCumulative ? 'PUT' : 'POST',
      headers: {
        Accept: 'application/vnd.hmrc.5.0+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...fraudPreventionHeaders,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await hmrcResponse.text();
    let responseBody: unknown = undefined;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }
    }

    if (!hmrcResponse.ok) {
      return NextResponse.json(
        { error: hmrcErrorMessage(responseBody), details: responseBody },
        { status: hmrcResponse.status },
      );
    }

    return NextResponse.json({ success: true, response: responseBody }, { status: 200 });
  } catch (error) {
    console.error('HMRC quarterly update submission failed:', error);
    return NextResponse.json({ error: 'Unable to reach HMRC' }, { status: 502 });
  }
}