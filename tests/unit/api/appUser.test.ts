import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, getSessionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: getSessionMock } }));

import { ensureAppUser, getAuthenticatedAppUser } from "@/lib/appUser";

describe("Auth0 user provisioning", () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue({ rows: [{ id: "42" }] });
    getSessionMock.mockReset();
  });

  it("upserts by the Auth0 subject and returns the existing or inserted database id", async () => {
    const user = await ensureAppUser({
      sub: "auth0|customer-42",
      email: "customer@example.com",
      name: "Example Customer",
    });

    expect(user).toEqual({ id: "42" });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (auth_id) DO UPDATE"),
      ["auth0|customer-42", "customer@example.com", "Example Customer"],
    );
  });

  it("does not accept an absent Auth0 subject as a user identity", async () => {
    await expect(ensureAppUser({ email: "customer@example.com" }))
      .rejects.toThrow("Authenticated user is missing an Auth0 subject");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("creates the database row from the signed-in session and ignores client identity", async () => {
    getSessionMock.mockResolvedValue({
      user: { sub: "auth0|signed-in-user", email: "user@example.com", name: "Signed In" },
    });

    const user = await getAuthenticatedAppUser();

    expect(user).toEqual({ id: "42" });
    expect(queryMock).toHaveBeenCalledWith(
      expect.any(String),
      ["auth0|signed-in-user", "user@example.com", "Signed In"],
    );
  });

  it("does not create a database row when there is no Auth0 session", async () => {
    getSessionMock.mockResolvedValue(null);

    expect(await getAuthenticatedAppUser()).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
