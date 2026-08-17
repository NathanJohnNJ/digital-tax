import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../../utils/buildFraudPreventionHeaders";
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';

export async function POST(req: NextRequest) {
  const { clientData, nino } = await req.json();
  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData);
  const cookieStore = await cookies();
  // const ninoIsValid = /^[A-Z]{2}\d{6}[A-Z]$/.test(String(nino ?? ""));

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

  const requestUrl = `${HMRC_CONFIG.testApiUrl}/individuals/business/details/${nino}/list`;
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
    let businessResponse: any;
    try {
      businessResponse = JSON.parse(businessResponseText);
    } catch {
      businessResponse = businessResponseText;
    }

    if(!businessRequest.ok){
      return Response.json({ businessResponse }, { status: 400 });
    }
    return NextResponse.json(businessResponse);
  } catch (err){
    console.error(err)

    return NextResponse.json({ error: err }, { status: 500 });
  }

}

