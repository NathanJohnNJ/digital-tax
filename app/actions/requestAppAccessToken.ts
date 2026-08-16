'use server'

import { HMRC_CONFIG } from "@/config/hmrc";

export async function requestAppAccessToken(scopes?: any){
  console.log('Requesting new application restricted access token');

  let searchParams;
  if(!scopes){
    searchParams = {
      grant_type: "client_credentials",
      client_id: HMRC_CONFIG.clientId,
      client_secret: HMRC_CONFIG.clientSecret,
    };
  } else {
    searchParams = {
      grant_type: "client_credentials",
      client_id: HMRC_CONFIG.clientId,
      client_secret: HMRC_CONFIG.clientSecret,
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