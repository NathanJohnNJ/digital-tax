import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';
import { HMRC_CONFIG } from '@/config/hmrc';
import { getFromDate, getToDate } from '@/app/api/utils/ukTaxYear';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildFraudPreventionHeaders } from '../../../utils/buildFraudPreventionHeaders';

type HmrcPeriod = {
  periodId?: string;
  periodDates?: { periodStartDate?: string; periodEndDate?: string };
  periodIncome?: Record<string, number>;
  periodExpenses?: Record<string, number>;
  periodDisallowableExpenses?: Record<string, number>;
  receivedDate?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(body: unknown) {
  if (isRecord(body) && typeof body.message === 'string') return body.message;
  return 'HMRC quarterly update history request failed';
}

function periodDatesFromId(periodId?: string) {
  const match = periodId && /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(periodId);
  return match ? { periodStartDate: match[1], periodEndDate: match[2] } : undefined;
}

function listObligations(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.obligations)) return [];
  return body.obligations.flatMap((item) => {
    if (!isRecord(item)) return [];
    if (Array.isArray(item.obligationDetails)) return item.obligationDetails.filter(isRecord);
    return [item];
  });
}

function receivedDateForPeriod(obligations: Record<string, unknown>[], periodEndDate?: string) {
  if (!periodEndDate) return undefined;
  const exactMatch = obligations.find((obligation) =>
    obligation.periodEndDate === periodEndDate && obligation.status === 'fulfilled' && typeof obligation.receivedDate === 'string',
  );
  if (exactMatch && typeof exactMatch.receivedDate === 'string') return exactMatch.receivedDate;

  const coveringUpdates = obligations
    .filter((obligation) =>
      typeof obligation.periodEndDate === 'string' &&
      obligation.periodEndDate <= periodEndDate &&
      obligation.status === 'fulfilled' &&
      typeof obligation.receivedDate === 'string',
    )
    .sort((left, right) => String(right.periodEndDate).localeCompare(String(left.periodEndDate)));
  return typeof coveringUpdates[0]?.receivedDate === 'string' ? coveringUpdates[0].receivedDate : undefined;
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

  const { clientData, nino, businessId, taxYear } = input;
  if (typeof nino !== 'string' || !/^[A-Z]{2}\d{6}[A-D]$/.test(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (typeof businessId !== 'string' || !/^X[A-Z0-9]IS\d{11}$/.test(businessId)) {
    return NextResponse.json({ error: 'A valid HMRC business ID is required' }, { status: 400 });
  }
  if (typeof taxYear !== 'string') {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }
  const taxYearMatch = /^(\d{4})-(\d{2})$/.exec(taxYear);
  if (!taxYearMatch || Number(taxYearMatch[2]) !== (Number(taxYearMatch[1]) + 1) % 100) {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }

  let token = (await cookies()).get('access_token')?.value;
  if (!token) {
    const tokenResult = await requestUserAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json({ status: tokenResult.status, body: tokenResult.body }, { status: tokenResult.status });
    }
    token = tokenResult.tokens.access_token;
  }
  if (!token) return NextResponse.json({ error: 'Missing access token' }, { status: 401 });

  try {
    const fraudHeaders = await buildFraudPreventionHeaders(clientData);
    const apiHeaders = {
      Authorization: `Bearer ${token}`,
      ...fraudHeaders,
    };
    const isCumulative = Number(taxYear.slice(0, 4)) >= 2025;
    const summaryPath = isCumulative
      ? `/individuals/business/self-employment/${nino}/${businessId}/cumulative/${taxYear}`
      : `/individuals/business/self-employment/${nino}/${businessId}/period/${taxYear}`;
    const summaryResponse = await fetch(`${HMRC_CONFIG.testApiUrl}${summaryPath}`, {
      headers: { Accept: 'application/vnd.hmrc.5.0+json', ...apiHeaders },
    });
    const summaryBody = await readJson(summaryResponse);

    if (!summaryResponse.ok && summaryResponse.status !== 404) {
      return NextResponse.json({ error: messageFrom(summaryBody) }, { status: summaryResponse.status });
    }

    const obligationUrl = new URL(`${HMRC_CONFIG.testApiUrl}/obligations/details/${nino}/income-and-expenditure`);
    obligationUrl.searchParams.set('businessId', businessId);
    obligationUrl.searchParams.set('typeOfBusiness', 'self-employment');
    obligationUrl.searchParams.set('fromDate', getFromDate(taxYear));
    obligationUrl.searchParams.set('toDate', getToDate(taxYear));
    const obligationsResponse = await fetch(obligationUrl, {
      headers: { Accept: 'application/vnd.hmrc.3.0+json', ...apiHeaders },
    });
    const obligationsBody = await readJson(obligationsResponse);
    const obligations = obligationsResponse.ok ? listObligations(obligationsBody) : [];

    if (isCumulative) {
      if (!summaryResponse.ok || !isRecord(summaryBody)) {
        return NextResponse.json({ updates: [] });
      }
      const period = summaryBody as HmrcPeriod;
      const end = period.periodDates?.periodEndDate;
      return NextResponse.json({
        updates: [{
          ...period,
          isCumulative: true,
          receivedDate: receivedDateForPeriod(obligations, end),
        }],
      });
    }

    const periodList = isRecord(summaryBody) && Array.isArray(summaryBody.periods)
      ? summaryBody.periods.filter(isRecord) as HmrcPeriod[]
      : [];
    const details = await Promise.all(periodList.map(async (period) => {
      if (period.periodDates && period.periodIncome && period.periodExpenses) return period;
      const dates = period.periodDates ?? periodDatesFromId(period.periodId);
      if (!period.periodId) return { ...period, periodDates: dates };

      const detailResponse = await fetch(
        `${HMRC_CONFIG.testApiUrl}/individuals/business/self-employment/${nino}/${businessId}/period/${taxYear}/${encodeURIComponent(period.periodId)}`,
        { headers: { Accept: 'application/vnd.hmrc.5.0+json', ...apiHeaders } },
      );
      if (!detailResponse.ok) return { ...period, periodDates: dates };
      const detailBody = await readJson(detailResponse);
      return isRecord(detailBody) ? detailBody as HmrcPeriod : { ...period, periodDates: dates };
    }));

    const updates = details
      .map((period) => ({
        ...period,
        receivedDate: receivedDateForPeriod(obligations, period.periodDates?.periodEndDate),
      }))
      .sort((left, right) => String(left.periodDates?.periodStartDate).localeCompare(String(right.periodDates?.periodStartDate)));

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('HMRC quarterly update history request failed:', error);
    return NextResponse.json({ error: 'Unable to retrieve submitted updates from HMRC' }, { status: 502 });
  }
}