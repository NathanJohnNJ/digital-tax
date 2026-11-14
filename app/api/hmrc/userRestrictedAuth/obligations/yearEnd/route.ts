import { HMRC_CONFIG } from '@/config/hmrc';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentHmrcAccessToken,
  markCurrentHmrcAuthorizationRequired,
} from '@/lib/hmrcTokens';
import { buildFraudPreventionHeaders } from '../../../../utils/buildFraudPreventionHeaders';
import { isFraudClientData } from '../../../../utils/hmrcFraudValidation';
import {
  forwardValidatedHmrcResponse,
  isRecord,
  isValidNino,
  isValidTaxYear,
  isYearEndObligationsResponse,
  readJsonRecord,
} from '../../../../utils/hmrcValidation';

export async function POST(request: NextRequest) {
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { clientData, nino, taxYear } = parsed.value;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
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
      `${HMRC_CONFIG.testApiUrl}/obligations/details/${encodeURIComponent(nino)}/crystallisation`,
    );
    requestUrl.searchParams.set('taxYear', taxYear);

    const hmrcResponse = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.hmrc.3.0+json',
        Authorization: `Bearer ${token}`,
        ...fraudPreventionHeaders,
      },
    });

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'year-end obligations request',
      isYearEndObligationsResponse,
      [nino],
      200,
      markCurrentHmrcAuthorizationRequired,
    );
  } catch (error) {
    console.error('HMRC year-end obligations request could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Unable to retrieve year-end obligations from HMRC. Please try again later.' },
      { status: 502 },
    );
  }
}
