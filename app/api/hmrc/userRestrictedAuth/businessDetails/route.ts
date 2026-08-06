import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../../utils/buildFraudPreventionHeaders";

export async function POST(req: NextRequest) {
  const { clientData, niInput: nino } = await req.json();
  const cookieStore = await cookies();
  

  let token = cookieStore.get('access_token')?.value;

  if(!token){
    const code = cookieStore.get('code')?.value;

    if(!code){
      return Response.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const tokenResponse = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: HMRC_CONFIG.clientId,
        client_secret: HMRC_CONFIG.clientSecret,
        redirect_uri: HMRC_CONFIG.redirectUri
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

      cookieStore.set('access_token', tokens.access_token, options);
      cookieStore.set('refresh_token', tokens.refresh_token, options);
      token = tokens.access_token;

    } catch (err) {
      console.error("Failed to parse token response:", err);

      return Response.json({ error: "Invalid token response" }, { status: 500 });
    }
  }

  try {
    const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData);

    const businessResponse = await fetch(`${HMRC_CONFIG.testApiUrl}/individuals/business/details/${nino}/list`, {
      method: "GET",
      headers: {
        "Accept": "application/vnd.hmrc.2.0+json",
        "Authorization": `Bearer ${token}`,
        "Gov-Test-Scenario": "STATEFUL",
        ...fraudPreventionHeaders
      },
    })
    console.log(token);
    console.log(fraudPreventionHeaders);
    console.log(await businessResponse.json());

    if(!businessResponse.ok){
      return Response.json({ status: businessResponse.status });
    }

    const data = await businessResponse.json();
    return NextResponse.json(data);

  } catch (err){
    console.error(err)

    return NextResponse.json({ error: err }, { status: 500});
  }

}

