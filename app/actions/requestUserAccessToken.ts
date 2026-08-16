'use server'

import { HMRC_CONFIG } from "@/config/hmrc";
import { cookies } from 'next/headers';

export async function requestUserAccessToken(scopes?: any){
  console.log('Requesting new application restricted access token');

  const cookieStore = await cookies();
  const code = cookieStore.get('code')?.value;
  if(!code){
    console.log("[HMRC debug] missing authorization code in cookie store");
    return Response.json({ error: "Missing authorization code" }, { status: 400 });
  }

  let searchParams;
  if(!scopes){
    searchParams = {
      grant_type: "authorization_code",
      code: code,
      client_id: HMRC_CONFIG.clientId,
      client_secret: HMRC_CONFIG.clientSecret,
      redirect_uri: HMRC_CONFIG.redirectUri
    };
  } else {
    searchParams = {
      grant_type: "authorization_code",
      code: code,
      client_id: HMRC_CONFIG.clientId,
      client_secret: HMRC_CONFIG.clientSecret,
      redirect_uri: HMRC_CONFIG.redirectUri,
      scope: scopes
    };
  }
  const tokenResponse = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(searchParams)
  });

  if (!tokenResponse.ok) {
    const tokenErrorText = await tokenResponse.text();
    return Response.json({ status: tokenResponse.status, body: tokenErrorText }, { status: tokenResponse.status });
  }

  try {
    const tokens = await tokenResponse.json();
    return tokens;
  } catch (err) {
    console.error("Failed to parse token response:", err);
    return Response.json({ error: "Invalid token response" }, { status: 500 });
  }
}