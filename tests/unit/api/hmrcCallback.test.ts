import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmrcOAuthStateCookie } from "@/lib/hmrcOAuthState";

const {
  cookiesMock,
  getSessionMock,
  ensureAppUserMock,
  saveHmrcTokensMock,
  requestUserAccessTokenMock,
  deleteCookieMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getSessionMock: vi.fn(),
  ensureAppUserMock: vi.fn(),
  saveHmrcTokensMock: vi.fn(),
  requestUserAccessTokenMock: vi.fn(),
  deleteCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: getSessionMock } }));
vi.mock("@/lib/appUser", () => ({ ensureAppUser: ensureAppUserMock }));
vi.mock("@/lib/hmrcTokens", () => ({ saveHmrcTokens: saveHmrcTokensMock }));
vi.mock("@/app/actions/requestUserAccessToken", () => ({
  requestUserAccessToken: requestUserAccessTokenMock,
}));

describe("HMRC authorization callback", () => {
  let get: typeof import("@/app/api/hmrc/userRestrictedAuth/callback/route").GET;
  const state = "a-one-time-state";
  const subject = "auth0|customer-42";
  const tokenSet = {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 14_400,
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("AUTH0_SECRET", "test-auth0-secret");
    vi.stubEnv(
      "HMRC_REDIRECT_URI",
      "http://localhost/api/hmrc/userRestrictedAuth/callback",
    );
    deleteCookieMock.mockReset();
    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) => name === "hmrc_oauth_state"
        ? { value: createHmrcOAuthStateCookie(state, subject) }
        : name === "access_token" ? { value: "legacy-access-token" } : undefined),
      delete: deleteCookieMock,
    });
    getSessionMock.mockReset().mockResolvedValue({ user: { sub: subject, email: "customer@example.com" } });
    ensureAppUserMock.mockReset().mockResolvedValue({ id: "42" });
    saveHmrcTokensMock.mockReset().mockResolvedValue(undefined);
    requestUserAccessTokenMock.mockReset().mockResolvedValue({ ok: true, tokens: tokenSet });
    ({ GET: get } = await import("@/app/api/hmrc/userRestrictedAuth/callback/route"));
  });

  it("exchanges each callback code and stores tokens for the signed-in user, regardless of old token cookies", async () => {
    const request = new NextRequest(
      `http://localhost/api/hmrc/userRestrictedAuth/callback?code=one-time-code&state=${state}`,
    );

    const response = await get(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/account");
    expect(requestUserAccessTokenMock).toHaveBeenCalledWith("one-time-code");
    expect(saveHmrcTokensMock).toHaveBeenCalledWith("42", tokenSet);
    expect(deleteCookieMock).toHaveBeenCalledWith("access_token");
    expect(deleteCookieMock).toHaveBeenCalledWith("refresh_token");
  });

  it("rejects state that does not match the callback", async () => {
    const request = new NextRequest(
      `http://localhost/api/hmrc/userRestrictedAuth/callback?code=one-time-code&state=forged-state`,
    );

    const response = await get(request);

    expect(response.status).toBe(400);
    expect(requestUserAccessTokenMock).not.toHaveBeenCalled();
    expect(saveHmrcTokensMock).not.toHaveBeenCalled();
  });
});
