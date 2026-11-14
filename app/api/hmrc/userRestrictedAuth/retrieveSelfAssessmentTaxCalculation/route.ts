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
  isCalculationResponse,
  isRecord,
  isValidCalculationId,
  isValidNino,
  isValidTaxYear,
  readJsonRecord,
} from '../../../utils/hmrcValidation';

export async function POST(request: NextRequest) {
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { clientData, nino, taxYear, calculationId } = parsed.value;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (!isValidTaxYear(taxYear)) {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }
  if (!isValidCalculationId(calculationId)) {
    return NextResponse.json({ error: 'A valid calculation ID is required' }, { status: 400 });
  }
  if (!isFraudClientData(clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data is invalid' }, { status: 400 });
  }

  try {
    const fraudHeaders = await buildFraudPreventionHeaders(clientData, request);
    const tokenResult = await getCurrentHmrcAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status });
    }
    const token = tokenResult.accessToken;

    const endpoint = [
      HMRC_CONFIG.testApiUrl,
      'individuals/calculations',
      encodeURIComponent(nino),
      'self-assessment',
      encodeURIComponent(taxYear),
      encodeURIComponent(calculationId),
    ].join('/');
    const hmrcResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.hmrc.9.0+json',
        Authorization: `Bearer ${token}`,
        ...fraudHeaders,
      },
    });

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'tax calculation retrieval',
      (body) => isCalculationResponse(body)
        && body.metadata.calculationId === calculationId
        && body.metadata.taxYear === taxYear,
      [nino, calculationId],
      200,
      markCurrentHmrcAuthorizationRequired,
    );
  } catch (error) {
    console.error('HMRC tax calculation retrieval could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json({ error: 'Unable to retrieve the tax calculation from HMRC.' }, { status: 502 });
  }
}
