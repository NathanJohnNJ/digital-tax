import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../utils/buildFraudPreventionHeaders";
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';

export async function POST(req: NextRequest, route: string, searchParams: string) {
  const { clientData } = await req.json();
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

  const requestUrl = new URL(`${HMRC_CONFIG.testApiUrl}${route}`);
  requestUrl.search = searchParams;
  
  const requestHeaders = {
    "Accept": "application/vnd.hmrc.9.0+json",
    "Authorization": `Bearer ${token}`,
    ...fraudPreventionHeaders
  };

  try {
    const request = await fetch(requestUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    const responseText = await request.text();
    let response: any;
    try {
      response = JSON.parse(responseText);
    } catch {
      response = responseText;
    }

    if (!request.ok) {
      const message = typeof response?.message === 'string'
        ? response.message
        : 'HMRC request failed';

      return NextResponse.json(
        { error: message, status: request.status },
        { status: request.status }
      );
    }

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);           
    console.error('HMRC request failed:', err);

    return NextResponse.json({ error: message }, { status: 500 });
  }

}

