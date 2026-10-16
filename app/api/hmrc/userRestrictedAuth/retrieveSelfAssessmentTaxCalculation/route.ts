import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';
import { HMRC_CONFIG } from '@/config/hmrc';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildFraudPreventionHeaders } from '../../../utils/buildFraudPreventionHeaders';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTaxYear(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return Boolean(
    match
    && Number(match[1]) >= 2017
    && Number(match[2]) === (Number(match[1]) + 1) % 100,
  );
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(body: unknown) {
  if (isRecord(body) && typeof body.message === 'string') return body.message;
  return 'HMRC tax calculation retrieval failed';
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

  const { clientData, nino, taxYear, calculationId } = input;
  if (typeof nino !== 'string' || !/^[A-Z]{2}\d{6}[A-D]$/.test(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (!isValidTaxYear(taxYear)) {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }
  if (typeof calculationId !== 'string' || !calculationId.trim() || calculationId.length > 100) {
    return NextResponse.json({ error: 'A valid calculation ID is required' }, { status: 400 });
  }
  if (!isRecord(clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data is required' }, { status: 400 });
  }

  try {
    const fraudHeaders = await buildFraudPreventionHeaders(clientData, request);
    const cookieStore = await cookies();
    let token = cookieStore.get('access_token')?.value;

    if (!token) {
      const tokenResult = await requestUserAccessToken();
      if (!tokenResult.ok) {
        const message = isRecord(tokenResult.body) && typeof tokenResult.body.error === 'string'
          ? tokenResult.body.error
          : 'HMRC authorisation is required';
        return NextResponse.json(
          { error: message, details: tokenResult.body },
          { status: tokenResult.status },
        );
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
    const responseBody = await readResponse(hmrcResponse);

    if (!hmrcResponse.ok) {
      return NextResponse.json(
        { error: getErrorMessage(responseBody), details: responseBody },
        { status: hmrcResponse.status },
      );
    }

    return NextResponse.json(responseBody, { status: hmrcResponse.status });
  } catch (error) {
    console.error('HMRC tax calculation retrieval failed:', error);
    return NextResponse.json({ error: 'Unable to reach HMRC' }, { status: 502 });
  }
}
