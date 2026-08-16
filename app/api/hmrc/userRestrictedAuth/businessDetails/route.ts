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

  let token;
  if(!cookieStore.has('access_token')){ 
    token = await requestUserAccessToken();
    const options = {
      httpOnly: true,
      maxAge: token.expires_in,
      secure: process.env.NODE_ENV === "production"
    }
    cookieStore.set('access_token', token.access_token, options);
    cookieStore.set('refresh_token', token.refresh_token, options);
    token = token.access_token;
  } else {
    token = cookieStore.get('access_token')?.value;
  }

  const requestUrl = `${HMRC_CONFIG.testApiUrl}/individuals/business/details/${nino}/list`;
  const requestHeaders = {
    "Accept": "application/vnd.hmrc.2.0+json",
    "Authorization": `Bearer ${token}`,
    "Gov-Test-Scenario": "N/A",
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

