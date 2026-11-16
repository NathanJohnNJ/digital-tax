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
  isCalculationTriggerResponse,
  isRecord,
  isValidNino,
  isValidTaxYear,
  readJsonRecord,
} from '../../../utils/hmrcValidation';

export async function POST(request: NextRequest) {
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { clientData, nino, taxYear, calculationType } = parsed.value;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (!isValidTaxYear(taxYear)) {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }
  if (calculationType !== 'in-year' && calculationType !== 'intent-to-finalise') {
    return NextResponse.json({ error: 'Calculation type must be in-year or intent-to-finalise' }, { status: 400 });
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
      'trigger',
      encodeURIComponent(calculationType),
    ].join('/');
    const hmrcResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.hmrc.9.0+json',
        Authorization: `Bearer ${token}`,
        ...fraudHeaders,
      },
    });

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'tax calculation trigger',
      isCalculationTriggerResponse,
      [nino],
      202,
      markCurrentHmrcAuthorizationRequired,
    );
  } catch (error) {
    console.error('HMRC tax calculation trigger could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json({ error: 'Unable to trigger the tax calculation with HMRC.' }, { status: 502 });
  }
}
