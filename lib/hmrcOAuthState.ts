import { createHmac, timingSafeEqual } from "node:crypto";

function stateSignature(state: string, auth0Subject: string): string {
  const secret = process.env.AUTH0_SECRET;
  if (!secret) {
    throw new Error("AUTH0_SECRET is not configured");
  }

  return createHmac("sha256", secret)
    .update(`${state}:${auth0Subject}`)
    .digest("base64url");
}

export function createHmrcOAuthStateCookie(state: string, auth0Subject: string): string {
  return `${state}.${stateSignature(state, auth0Subject)}`;
}

export function verifyHmrcOAuthStateCookie(
  cookieValue: string,
  returnedState: string,
  auth0Subject: string,
): boolean {
  const [storedState, storedSignature, extra] = cookieValue.split(".");
  if (!storedState || !storedSignature || extra || storedState !== returnedState) {
    return false;
  }

  const expected = Buffer.from(stateSignature(storedState, auth0Subject));
  const actual = Buffer.from(storedSignature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
