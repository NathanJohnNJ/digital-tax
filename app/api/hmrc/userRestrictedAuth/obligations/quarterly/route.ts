import { HMRC_CONFIG } from '@/config/hmrc';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentHmrcAccessToken,
  markCurrentHmrcAuthorizationRequired,
} from '@/lib/hmrcTokens';
import { buildFraudPreventionHeaders } from '../../../../utils/buildFraudPreventionHeaders';
import { isFraudClientData } from '../../../../utils/hmrcFraudValidation';
import { getFromDate, getToDate } from '../../../../utils/ukTaxYear';
import {
  forwardValidatedHmrcResponse,
  isQuarterlyObligationsResponse,
  isRecord,
  isValidBusinessId,
  isValidNino,
  isValidTaxYear,
  readJsonRecord,
} from '../../../../utils/hmrcValidation';

export async function POST(request: NextRequest) {
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { clientData, nino, businessId, taxYear } = parsed.value;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (!isValidBusinessId(businessId)) {
    return NextResponse.json({ error: 'A valid business ID is required' }, { status: 400 });
  }
  if (!isValidTaxYear(taxYear)) {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }
  if (!isFraudClientData(clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data is invalid' }, { status: 400 });
  }

  try {
    const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData, request);
    const tokenResult = await getCurrentHmrcAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status });
    }
    const token = tokenResult.accessToken;

    const requestUrl = new URL(
      `${HMRC_CONFIG.testApiUrl}/obligations/details/${encodeURIComponent(nino)}/income-and-expenditure`,
    );
    requestUrl.searchParams.set('businessId', businessId);
    requestUrl.searchParams.set('typeOfBusiness', 'self-employment');
    requestUrl.searchParams.set('fromDate', getFromDate(taxYear));
    requestUrl.searchParams.set('toDate', getToDate(taxYear));

    const hmrcResponse = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.hmrc.3.0+json',
        Authorization: `Bearer ${token}`,
        ...fraudPreventionHeaders,
        'Gov-Test-Scenario': 'DYNAMIC',
      },
    });

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'quarterly obligations request',
      isQuarterlyObligationsResponse,
      [nino, businessId],
      200,
      markCurrentHmrcAuthorizationRequired,
    );
  } catch (error) {
    console.error('HMRC quarterly obligations request could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Unable to retrieve quarterly obligations from HMRC. Please try again later.' },
      { status: 502 },
    );
  }
}
