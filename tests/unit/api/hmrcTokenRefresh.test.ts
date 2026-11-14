import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentHmrcAccessToken } = vi.hoisted(() => ({
  getCurrentHmrcAccessToken: vi.fn(),
}));

vi.mock("@/lib/hmrcTokens", () => ({ getCurrentHmrcAccessToken }));

describe("HMRC refresh-token route", () => {
  let get: typeof import("@/app/api/hmrc/userRestrictedAuth/refresh/route").GET;

  beforeEach(async () => {
    vi.resetModules();
    getCurrentHmrcAccessToken.mockReset();
    ({ GET: get } = await import("@/app/api/hmrc/userRestrictedAuth/refresh/route"));
  });

  it("returns an authorization error when no refreshable account is available", async () => {
    getCurrentHmrcAccessToken.mockResolvedValue({
      ok: false,
      status: 401,
      error: "HMRC authorization is required",
    });

    const response = await get();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "HMRC authorization is required" });
  });

  it("returns refresh errors without exposing token values", async () => {
    getCurrentHmrcAccessToken.mockResolvedValue({
      ok: false,
      status: 502,
      error: "HMRC could not refresh your authorisation.",
    });

    const response = await get();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "HMRC could not refresh your authorisation." });
  });

  it("reports success without returning the refreshed access token", async () => {
    getCurrentHmrcAccessToken.mockResolvedValue({
      ok: true,
      accessToken: "secret-access-token",
    });

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(getCurrentHmrcAccessToken).toHaveBeenCalledWith({ forceRefresh: true });
  });
});
