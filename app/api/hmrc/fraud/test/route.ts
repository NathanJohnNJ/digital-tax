import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../../utils/buildFraudPreventionHeaders";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  let token = cookieStore.get('application_access_token')?.value;
  if(!token){
    const tokenResponse = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: HMRC_CONFIG.clientId,
        client_secret: HMRC_CONFIG.clientSecret,
      })
    });
  
    if (!tokenResponse.ok) {
      return Response.json({ status: tokenResponse.status });
    }
    let tokens;
    try {
      const text = await tokenResponse.text();
      tokens = JSON.parse(text);
      const options = {
        httpOnly: true,
        secure: true, 
        maxAge: tokens.expires_in
      }
      cookieStore.set('application_access_token', tokens.access_token, options);
      token = tokens.access_token
    } catch (err) {
      console.error("Failed to parse token response:", err);
      return Response.json({ error: "Invalid token response" }, { status: 500 });
    }
  }

  const clientData = await req.json();
  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData);
  const response = await fetch(`${HMRC_CONFIG.testApiUrl}/test/fraud-prevention-headers/business-details-mtd/validation-feedback?connectionMethod=WEB_APP_VIA_SERVER`, {
    method: "GET",
    headers: {
      "Accept": "application/vnd.hmrc.1.0+json",
      "Authorization": `Bearer ${token}`,
      ...fraudPreventionHeaders
    },
  });
  console.log(token);
  console.log(fraudPreventionHeaders);
  console.log(await response.text());
  if (!response.ok) {
    return Response.json({ status: response.status });
  }
  const data = await response.json();
  console.log(data);
  return NextResponse.json(data);
}
