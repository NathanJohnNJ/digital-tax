import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectMock,
  poolQueryMock,
  clientQueryMock,
  releaseMock,
  getSessionMock,
  ensureAppUserMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  poolQueryMock: vi.fn(),
  clientQueryMock: vi.fn(),
  releaseMock: vi.fn(),
  getSessionMock: vi.fn(),
  ensureAppUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  pool: { connect: connectMock, query: poolQueryMock },
}));
vi.mock("@/lib/auth0", () => ({
  auth0: { getSession: getSessionMock },
}));
vi.mock("@/lib/appUser", () => ({
  ensureAppUser: ensureAppUserMock,
}));

import { getCurrentHmrcAccessToken, saveHmrcTokens } from "@/lib/hmrcTokens";

describe("per-user HMRC token storage and refresh", () => {
  const encryptionKey = Buffer.alloc(32, 7).toString("base64");

  beforeEach(() => {
    vi.stubEnv("HMRC_TOKEN_ENCRYPTION_KEY", encryptionKey);
    poolQueryMock.mockReset();
    clientQueryMock.mockReset();
    releaseMock.mockReset();
    getSessionMock.mockReset().mockResolvedValue({ user: { sub: "auth0|user-1" } });
    ensureAppUserMock.mockReset().mockResolvedValue({ id: "42" });
    connectMock.mockReset().mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    });
    clientQueryMock.mockResolvedValue({ rows: [] });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("encrypts tokens before persisting them for a user", async () => {
    await saveHmrcTokens("42", {
      access_token: "plain-access-token",
      refresh_token: "plain-refresh-token",
      expires_in: 14_400,
    });

    const [query, values] = poolQueryMock.mock.calls[0] as [string, unknown[]];
    expect(query).toContain("INSERT INTO public.hmrc_user_tokens");
    expect(values).toEqual([
      "42",
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      "v1",
      14_400,
    ]);
    expect(values.join("|")).not.toContain("plain-access-token");
    expect(values.join("|")).not.toContain("plain-refresh-token");
  });

  it("automatically rotates expired tokens under a row lock and stores both replacements", async () => {
    await saveHmrcTokens("42", {
      access_token: "old-access-token",
      refresh_token: "old-refresh-token",
      expires_in: 14_400,
    });
    const storedValues = poolQueryMock.mock.calls[0]?.[1] as unknown[];
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT access_token_ciphertext")) {
        return {
          rows: [{
            access_token_ciphertext: storedValues[1],
            access_token_iv: storedValues[2],
            refresh_token_ciphertext: storedValues[3],
            refresh_token_iv: storedValues[4],
            encryption_key_version: "v1",
            expires_at: new Date(0),
            reauthorization_required: false,
          }],
        };
      }
      return { rows: [] };
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 14_400,
    }), { status: 200 }));

    const result = await getCurrentHmrcAccessToken();

    expect(result).toEqual({ ok: true, accessToken: "new-access-token" });
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      ["42"],
    );
    const refreshRequest = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(new URLSearchParams(refreshRequest.body as string).get("refresh_token")).toBe("old-refresh-token");
    const updateCall = clientQueryMock.mock.calls.find(([sql]) =>
      typeof sql === "string" && sql.includes("SET access_token_ciphertext = $2"),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall?.[1]).not.toContain("new-access-token");
    expect(updateCall?.[1]).not.toContain("new-refresh-token");
    expect(clientQueryMock).toHaveBeenCalledWith("COMMIT");
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("marks the authorization for relinking when HMRC rejects a consumed or expired refresh token", async () => {
    await saveHmrcTokens("42", {
      access_token: "old-access-token",
      refresh_token: "old-refresh-token",
      expires_in: 14_400,
    });
    const storedValues = poolQueryMock.mock.calls[0]?.[1] as unknown[];
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT access_token_ciphertext")) {
        return {
          rows: [{
            access_token_ciphertext: storedValues[1],
            access_token_iv: storedValues[2],
            refresh_token_ciphertext: storedValues[3],
            refresh_token_iv: storedValues[4],
            encryption_key_version: "v1",
            expires_at: new Date(0),
            reauthorization_required: false,
          }],
        };
      }
      return { rows: [] };
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      error: "invalid_grant",
    }), { status: 400 }));

    const result = await getCurrentHmrcAccessToken();

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET reauthorization_required = true"),
      ["42"],
    );
    expect(clientQueryMock).toHaveBeenCalledWith("COMMIT");
  });

  it("does not refresh an access token that still has time remaining", async () => {
    await saveHmrcTokens("42", {
      access_token: "current-access-token",
      refresh_token: "current-refresh-token",
      expires_in: 14_400,
    });
    const storedValues = poolQueryMock.mock.calls[0]?.[1] as unknown[];
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT access_token_ciphertext")) {
        return {
          rows: [{
            access_token_ciphertext: storedValues[1],
            access_token_iv: storedValues[2],
            refresh_token_ciphertext: storedValues[3],
            refresh_token_iv: storedValues[4],
            encryption_key_version: "v1",
            expires_at: new Date(Date.now() + 60 * 60 * 1000),
            reauthorization_required: false,
          }],
        };
      }
      return { rows: [] };
    });

    const result = await getCurrentHmrcAccessToken();

    expect(result).toEqual({ ok: true, accessToken: "current-access-token" });
    expect(fetch).not.toHaveBeenCalled();
    expect(clientQueryMock).toHaveBeenCalledWith("COMMIT");
  });
});
