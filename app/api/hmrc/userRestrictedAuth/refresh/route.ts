import { HMRC_CONFIG } from "@/config/hmrc";
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')!.value;

  const response = await fetch(`${HMRC_CONFIG.testAuthUrl}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: HMRC_CONFIG.clientId,
      client_secret: HMRC_CONFIG.clientSecret
    })
  });

  if (!response.ok) {
    return Response.json({ status: response.status });
  }

  let tokens;
  try {
    const text = await response.text();
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


  return Response.json({ success: true });
}
