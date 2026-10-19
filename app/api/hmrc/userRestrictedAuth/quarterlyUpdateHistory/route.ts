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

function isObligationGroup(
  value: unknown,
): value is Record<string, unknown> & { obligationDetails: Record<string, unknown>[] } {
  return isRecord(value)
    && Array.isArray(value.obligationDetails)
    && value.obligationDetails.every(isRecord);
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

function codeFrom(body: unknown) {
  return isRecord(body) && typeof body.code === 'string' ? body.code : undefined;
}

function isNotFound(body: unknown) {
  return codeFrom(body) === 'MATCHING_RESOURCE_NOT_FOUND';
}

function isNoObligationsFound(body: unknown) {
  return codeFrom(body) === 'NO_OBLIGATIONS_FOUND';
}

class HmrcResponseError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(messageFrom(body));
  }
}

function hmrcErrorResponse(error: HmrcResponseError) {
  console.error('HMRC quarterly update history request failed', {
    status: error.status,
    code: codeFrom(error.body),
  });
  return NextResponse.json(
    { error: error.message, status: error.status, details: error.body },
    { status: error.status },
  );
}

function listObligations(body: unknown): Record<string, unknown>[] | undefined {
  if (!isRecord(body) || !Array.isArray(body.obligations)) return undefined;
  if (!body.obligations.every(isObligationGroup)) return undefined;
  return body.obligations.flatMap((item) => item.obligationDetails);
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

    if (!summaryResponse.ok) {
      if (summaryResponse.status === 404 && isNotFound(summaryBody)) {
        return NextResponse.json({ updates: [] });
      }
      return hmrcErrorResponse(new HmrcResponseError(summaryResponse.status, summaryBody));
    }
    if (!isRecord(summaryBody)) {
      console.error('HMRC quarterly update history returned an invalid summary response', {
        status: summaryResponse.status,
      });
      return NextResponse.json({ error: 'HMRC returned an invalid submitted-updates response' }, { status: 502 });
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
    let obligations: Record<string, unknown>[];
    if (!obligationsResponse.ok) {
      if (obligationsResponse.status === 404 && isNoObligationsFound(obligationsBody)) {
        obligations = [];
      } else {
        return hmrcErrorResponse(new HmrcResponseError(obligationsResponse.status, obligationsBody));
      }
    } else {
      const parsedObligations = listObligations(obligationsBody);
      if (!parsedObligations) {
        console.error('HMRC obligations request returned an invalid response', {
          status: obligationsResponse.status,
        });
        return NextResponse.json({ error: 'HMRC returned an invalid obligations response' }, { status: 502 });
      }
      obligations = parsedObligations;
    }

    if (isCumulative) {
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

    if (!Array.isArray(summaryBody.periods) || !summaryBody.periods.every(isRecord)) {
      console.error('HMRC period summary list returned an invalid response');
      return NextResponse.json({ error: 'HMRC returned an invalid submitted-updates response' }, { status: 502 });
    }
    const periodList = summaryBody.periods as HmrcPeriod[];
    const details = await Promise.all(periodList.map(async (period) => {
      if (period.periodDates && period.periodIncome && period.periodExpenses) return period;
      if (!period.periodId) {
        throw new HmrcResponseError(502, { message: 'HMRC period summary did not include a period ID' });
      }

      const detailResponse = await fetch(
        `${HMRC_CONFIG.testApiUrl}/individuals/business/self-employment/${nino}/${businessId}/period/${taxYear}/${encodeURIComponent(period.periodId)}`,
        { headers: { Accept: 'application/vnd.hmrc.5.0+json', ...apiHeaders } },
      );
      const detailBody = await readJson(detailResponse);
      if (!detailResponse.ok) {
        if (detailResponse.status === 404 && isNotFound(detailBody)) return null;
        throw new HmrcResponseError(detailResponse.status, detailBody);
      }
      if (!isRecord(detailBody)) {
        throw new HmrcResponseError(502, { message: 'HMRC returned an invalid period summary response' });
      }
      return detailBody as HmrcPeriod;
    }));

    const updates = details
      .filter((period): period is HmrcPeriod => period !== null)
      .map((period) => ({
        ...period,
        receivedDate: receivedDateForPeriod(obligations, period.periodDates?.periodEndDate),
      }))
      .sort((left, right) => String(left.periodDates?.periodStartDate).localeCompare(String(right.periodDates?.periodStartDate)));

    return NextResponse.json({ updates });
  } catch (error) {
    if (error instanceof HmrcResponseError) {
      return hmrcErrorResponse(error);
    }
    console.error('HMRC quarterly update history request failed:', error);
    return NextResponse.json({ error: 'Unable to retrieve submitted updates from HMRC' }, { status: 502 });
  }
}