'use server'

import { HMRC_CONFIG } from "@/config/hmrc";

type TokenPayload = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  [key: string]: unknown;
};

export type TokenRequestResult =
  | { ok: true; tokens: TokenPayload }
  | { ok: false; status: number; body: unknown };

function isTokenPayload(value: unknown): value is TokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const token = value as Record<string, unknown>;
  return typeof token.access_token === 'string' && typeof token.expires_in === 'number';
}

export async function requestAppAccessToken(scopes?: any): Promise<TokenRequestResult> {
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
    let body: unknown;
    try {
      body = await tokenResponse.json();
    } catch {
      body = await tokenResponse.text();
    }

    return { ok: false, status: tokenResponse.status, body };
  }

  try {
    const payload = await tokenResponse.json();
    if (!isTokenPayload(payload)) {
      return {
        ok: false,
        status: 500,
        body: { error: "Invalid token response" }
      };
    }

    return { ok: true, tokens: payload };
  } catch (err) {
    console.error("Failed to parse token response:", err);
    return { ok: false, status: 500, body: { error: "Invalid token response" } };
  }
}