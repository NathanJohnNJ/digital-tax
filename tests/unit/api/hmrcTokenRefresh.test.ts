import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

function hmrcResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HMRC refresh-token route', () => {
  let get: typeof import('@/app/api/hmrc/userRestrictedAuth/refresh/route').GET;

  beforeEach(async () => {
    vi.resetModules();
    cookieStore.get.mockReturnValue({ value: 'single-use-refresh-token' });
    cookieStore.set.mockClear();
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.stubGlobal('fetch', vi.fn());
    ({ GET: get } = await import('@/app/api/hmrc/userRestrictedAuth/refresh/route'));
  });

  it('returns 401 without calling HMRC when the refresh cookie is missing', async () => {
    cookieStore.get.mockReturnValue(undefined);

    const response = await get();

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('link your HMRC account again') });
    expect(fetch).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('returns HMRC token endpoint failures with the upstream status', async () => {
    const errorBody = { error: 'invalid_grant', error_description: 'Refresh token is invalid' };
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(errorBody, 400));

    const response = await get();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'HMRC could not refresh your authorisation',
      details: errorBody,
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid JSON', new Response('not-json', { status: 200 })],
    ['missing access token', hmrcResponse({ expires_in: 14400, refresh_token: 'next-token' })],
    ['missing refresh token', hmrcResponse({ access_token: 'new-token', expires_in: 14400 })],
    ['invalid expiry', hmrcResponse({ access_token: 'new-token', expires_in: 0, refresh_token: 'next-token' })],
  ])('rejects a successful response with %s without updating cookies', async (_caseName, responseBody) => {
    vi.mocked(fetch).mockResolvedValueOnce(responseBody);

    const response = await get();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'HMRC returned an invalid token response' });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('stores both rotated tokens only after validating HMRC’s response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      access_token: 'new-access-token',
      expires_in: 14400,
      refresh_token: 'new-refresh-token',
    }));

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(cookieStore.set).toHaveBeenNthCalledWith(1, 'access_token', 'new-access-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 14400,
    });
    expect(cookieStore.set).toHaveBeenNthCalledWith(2, 'refresh_token', 'new-refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 14400,
    });
  });

  it('returns 502 when the HMRC token request cannot be completed', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await get();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Unable to reach HMRC to refresh your authorisation' });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
