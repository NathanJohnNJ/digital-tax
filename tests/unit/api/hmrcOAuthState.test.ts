import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmrcOAuthStateCookie, verifyHmrcOAuthStateCookie } from "@/lib/hmrcOAuthState";

describe("HMRC OAuth state", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("binds the state to the signed-in Auth0 subject", () => {
    vi.stubEnv("AUTH0_SECRET", "test-auth0-secret");
    const state = "random-state";
    const cookie = createHmrcOAuthStateCookie(state, "auth0|user-1");

    expect(verifyHmrcOAuthStateCookie(cookie, state, "auth0|user-1")).toBe(true);
    expect(verifyHmrcOAuthStateCookie(cookie, state, "auth0|user-2")).toBe(false);
    expect(verifyHmrcOAuthStateCookie(cookie, "different-state", "auth0|user-1")).toBe(false);
  });
});
