import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../../../utils/buildFraudPreventionHeaders";
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';

export async function POST(req: NextRequest) {
  const { clientData, nino, businessId, taxYear } = await req.json();
  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData);
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

  const requestUrl = new URL(`${HMRC_CONFIG.testApiUrl}/obligations/details/${nino}/crystallisation`);
  requestUrl.searchParams.set("businessId", businessId);
  requestUrl.searchParams.set("typeOfBusiness", "self-employment");
  requestUrl.searchParams.set("taxYear", taxYear);
  
  const requestHeaders = {
    "Accept": "application/vnd.hmrc.3.0+json",
    "Authorization": `Bearer ${token}`,
    ...fraudPreventionHeaders
  };

  try {
    const obligationsRequest = await fetch(requestUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    const obligationsResponseText = await obligationsRequest.text();
    let obligationsResponse: any;
    try {
      obligationsResponse = JSON.parse(obligationsResponseText);
    } catch {
      obligationsResponse = obligationsResponseText;
    }

    if (!obligationsRequest.ok) {
      const message = typeof obligationsResponse?.message === 'string'
        ? obligationsResponse.message
        : 'HMRC year end obligations request failed';

      return NextResponse.json(
        { error: message, status: obligationsRequest.status },
        { status: obligationsRequest.status }
      );
    }

    return NextResponse.json(obligationsResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('HMRC business list request failed:', err);

    return NextResponse.json({ error: message }, { status: 500 });
  }

}

