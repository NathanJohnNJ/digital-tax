import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../../utils/buildFraudPreventionHeaders";
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  if (!isRecord(input)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { clientData, nino, businessID } = input;
  if (typeof nino !== 'string' || !nino.trim() || typeof businessID !== 'string' || !businessID.trim()) {
    return NextResponse.json({ error: 'National Insurance number and business ID are required' }, { status: 400 });
  }

  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData, req);
  const cookieStore = await cookies();

  let token: string | undefined;
  if(!cookieStore.has('access_token')){ 
    const tokenResult = await requestUserAccessToken();
    if (!tokenResult.ok) {
      return Response.json({ status: tokenResult.status, body: tokenResult.body }, { status: tokenResult.status });
    }

    const options = {
      httpOnly: true,
      maxAge: tokenResult.tokens.expires_in,
      secure: process.env.NODE_ENV === "production"
    };
    cookieStore.set('access_token', tokenResult.tokens.access_token, options);
    if (tokenResult.tokens.refresh_token) {
      cookieStore.set('refresh_token', tokenResult.tokens.refresh_token, options);
    }
    token = tokenResult.tokens.access_token;
  } else {
    token = cookieStore.get('access_token')?.value;
  }

  if (!token) {
    return Response.json({ error: "Missing access token" }, { status: 401 });
  }

  const requestUrl = `${HMRC_CONFIG.testApiUrl}/individuals/business/details/${encodeURIComponent(nino)}/${encodeURIComponent(businessID)}`;
  const requestHeaders = {
    "Accept": "application/vnd.hmrc.2.0+json",
    "Authorization": `Bearer ${token}`,
    ...fraudPreventionHeaders
  };

  try {
    const businessRequest = await fetch(requestUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    const businessResponseText = await businessRequest.text();
    const correlationId = businessRequest.headers.get('X-CorrelationId');

    if (!businessRequest.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = JSON.parse(businessResponseText);
      } catch {
        errorDetails = undefined;
      }
      const errorRecord = isRecord(errorDetails) ? errorDetails : undefined;
      const errorCodes = errorRecord && Array.isArray(errorRecord.errors)
        ? errorRecord.errors.flatMap((detail) => isRecord(detail) && typeof detail.code === 'string' ? [detail.code] : [])
        : [];

      console.error('HMRC business details request failed', {
        status: businessRequest.status,
        correlationId: correlationId ?? undefined,
        code: errorRecord && typeof errorRecord.code === 'string' ? errorRecord.code : undefined,
        errorCodes,
      });

    }

    return new Response(businessResponseText || null, {
      status: businessRequest.status,
      headers: {
        'Content-Type': businessRequest.headers.get('content-type') ?? 'application/json',
        ...(correlationId ? { 'X-CorrelationId': correlationId } : {}),
      },
    });
  } catch (err){
    const errorMessage = err instanceof Error ? err.message : String(err);
    const safeErrorMessage = [nino, businessID]
      .filter(Boolean)
      .reduce((message, identifier) => message.replaceAll(identifier, '[redacted]'), errorMessage);
    console.error('HMRC business details request could not be completed', {
      errorName: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: safeErrorMessage,
    });

    return NextResponse.json(
      { error: 'Unable to retrieve business details from HMRC. Please try again later.' },
      { status: 502 },
    );
  }

}
