import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';
import { HMRC_CONFIG } from '@/config/hmrc';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildFraudPreventionHeaders } from '../../../../utils/buildFraudPreventionHeaders';
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
  if (!isRecord(clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data must be a JSON object' }, { status: 400 });
  }

  try {
    const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData, request);
    const cookieStore = await cookies();
    const hasAccessToken = cookieStore.has('access_token');
    let token = hasAccessToken ? cookieStore.get('access_token')?.value : undefined;

    if (!token && !hasAccessToken) {
      const tokenResult = await requestUserAccessToken();
      if (!tokenResult.ok) {
        return NextResponse.json({ error: 'HMRC authorisation is required' }, { status: tokenResult.status });
      }

      token = tokenResult.tokens.access_token;
      const options = {
        httpOnly: true,
        maxAge: tokenResult.tokens.expires_in,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      cookieStore.set('access_token', token, options);
      if (tokenResult.tokens.refresh_token) {
        cookieStore.set('refresh_token', tokenResult.tokens.refresh_token, options);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

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
      },
    });

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'quarterly obligations request',
      isQuarterlyObligationsResponse,
      [nino, businessId],
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
