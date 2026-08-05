import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const fullUrl = req.nextUrl;
  let baseUrl = fullUrl.toString().slice(0, 22);
  console.log(baseUrl);
  if (baseUrl !== 'http://localhost:3000/'){
    baseUrl = "https://dt.njtd.xyz/"
  }
  const cookieStore = await cookies();
  
  if (!code) {
    return Response.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const tokenResponse = await fetch(`${HMRC_CONFIG.testTokenUrl}`, {
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
  } catch (err) {
    console.error("Failed to parse token response:", err);
    return Response.json({ error: "Invalid token response" }, { status: 500 });
  }

  return NextResponse.redirect(`${baseUrl}/account`);
}

