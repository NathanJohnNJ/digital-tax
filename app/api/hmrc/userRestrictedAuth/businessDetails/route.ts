import { HMRC_CONFIG } from '@/config/hmrc';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentHmrcAccessToken,
  markCurrentHmrcAuthorizationRequired,
} from '@/lib/hmrcTokens';
import { buildFraudPreventionHeaders } from '../../../utils/buildFraudPreventionHeaders';
import { isFraudClientData } from '../../../utils/hmrcFraudValidation';
import {
  forwardValidatedHmrcResponse,
  isBusinessDetailsResponse,
  isRecord,
  isValidBusinessId,
  isValidNino,
  readJsonRecord,
} from '../../../utils/hmrcValidation';

export async function POST(request: NextRequest) {
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { clientData, nino, businessID } = parsed.value;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (!isValidBusinessId(businessID)) {
    return NextResponse.json({ error: 'A valid business ID is required' }, { status: 400 });
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

    const hmrcResponse = await fetch(
      `${HMRC_CONFIG.testApiUrl}/individuals/business/details/${encodeURIComponent(nino)}/${encodeURIComponent(businessID)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.hmrc.2.0+json',
          Authorization: `Bearer ${token}`,
          ...fraudPreventionHeaders,
        },
      },
    );

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'business details request',
      (responseBody) => isBusinessDetailsResponse(responseBody)
        && responseBody.businessId.toUpperCase() === businessID.toUpperCase(),
      [nino, businessID],
      200,
      markCurrentHmrcAuthorizationRequired,
    );
  } catch (error) {
    console.error('HMRC business details request could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Unable to retrieve business details from HMRC. Please try again later.' },
      { status: 502 },
    );
  }
}
