import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/config/hmrc', () => ({
  HMRC_CONFIG: {
    testApiUrl: 'https://test-api.service.hmrc.gov.uk',
    clientId: 'example-client',
    clientSecret: 'example-secret',
  },
}));

import { requestAppAccessToken } from '@/app/actions/requestAppAccessToken';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HMRC Sandbox application token', () => {
  it('uses the client-credentials grant without a scope for test-user APIs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      access_token: 'example-token',
      expires_in: 14400,
    })));

    expect(await requestAppAccessToken()).toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://test-api.service.hmrc.gov.uk/oauth/token',
      expect.objectContaining({
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'example-client',
          client_secret: 'example-secret',
        }),
      }),
    );
  });

  it('preserves a non-JSON HMRC token error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })));
    expect(await requestAppAccessToken()).toEqual({ ok: false, status: 503, body: 'Unavailable' });
  });

  it('returns a safe error if the token endpoint cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private connection details')));
    expect(await requestAppAccessToken()).toEqual({
      ok: false,
      status: 502,
      body: { error: 'Unable to reach HMRC Sandbox' },
    });
  });
});
