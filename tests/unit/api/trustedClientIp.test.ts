import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFraudPreventionHeaders } from '@/app/api/utils/buildFraudPreventionHeaders';
import { isFraudClientData } from '@/app/api/utils/hmrcFraudValidation';

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('@/lib/auth0', () => ({ auth0: { getSession: getSessionMock } }));

describe('HMRC fraud-prevention client data and trusted network headers', () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      user: { email: 'sandbox-user@example.test', sub: 'auth0|server-derived-user-id' },
    });
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubEnv('SERVER_PUBLIC_IP', '192.0.2.10');
    vi.stubEnv('HMRC_CLIENT_PUBLIC_IP_HEADER', 'x-pi-client-ip');
    vi.stubEnv('HMRC_CLIENT_PUBLIC_PORT_HEADER', 'x-pi-client-port');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts supported browser observations and rejects client-supplied network or identity fields', () => {
    expect(isFraudClientData({
      connectionMethod: 'WEB_APP_VIA_SERVER',
      browserUserAgent: 'Mozilla/5.0',
      deviceID: 'beec798b-b366-47fa-b1f8-92cede14a1ce',
      screens: 'width=1920&height=1080&scaling-factor=1&colour-depth=24',
      timezone: 'UTC+00:00',
      windowSize: 'width=1280&height=800',
    })).toBe(true);

    expect(isFraudClientData({
      publicIP: '198.51.100.10',
      publicIPTimestamp: '2000-01-01T00:00:00.000Z',
      publicPort: '443',
      userIds: 'Digital%20Tax=hard-coded-user',
    })).toBe(false);
    expect(isFraudClientData({ browserUserAgent: 'Mozilla/5.0\r\nAuthorization: forged' })).toBe(false);
    expect(isFraudClientData({ deviceID: 'not-a-uuid' })).toBe(false);
    expect(isFraudClientData({ multiFactor: 'type=TOTP&timestamp=2026-11-10T12%3A00Z&unique-reference=forged' })).toBe(false);
  });

  it('derives client IP, timestamp, and port from explicitly configured proxy headers', async () => {
    const request = new Request('https://example.test/api', {
      headers: {
        'x-pi-client-ip': '198.51.100.25',
        'x-pi-client-port': '54321',
        'x-forwarded-for': '203.0.113.99',
      },
    });

    const headers = await buildFraudPreventionHeaders({}, request);

    expect(headers['Gov-Client-Public-IP']).toBe('198.51.100.25');
    expect(headers['Gov-Client-Public-IP-Timestamp']).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(headers['Gov-Client-Public-IP-Timestamp']).not.toBe('2000-01-01T00:00:00.000Z');
    expect(headers['Gov-Client-Public-Port']).toBe('54321');
    expect(headers['Gov-Client-User-IDs']).toBe(
      'Digital%20Tax=sandbox-user%40example.test&Digital%20Tax-internal-id=auth0%7Cserver-derived-user-id',
    );
    expect(headers['Gov-Vendor-Public-IP']).toBe('192.0.2.10');
    expect(headers['Gov-Vendor-Forwarded']).toBe('by=192.0.2.10&for=198.51.100.25');
  });

  it('does not trust unconfigured forwarded headers or submit placeholder IP values', async () => {
    vi.stubEnv('HMRC_CLIENT_PUBLIC_IP_HEADER', '');
    vi.stubEnv('HMRC_CLIENT_PUBLIC_PORT_HEADER', '');
    const headers = await buildFraudPreventionHeaders({}, new Request('https://example.test/api', {
      headers: {
        'x-forwarded-for': '198.51.100.25',
        'x-real-ip': '198.51.100.26',
      },
    }));

    expect(headers).not.toHaveProperty('Gov-Client-Public-IP');
    expect(headers).not.toHaveProperty('Gov-Client-Public-IP-Timestamp');
    expect(headers).not.toHaveProperty('Gov-Client-Public-Port');
    expect(headers).not.toHaveProperty('Gov-Vendor-Forwarded');
  });

  it('omits malformed configured IP, port, and header names', async () => {
    vi.stubEnv('HMRC_CLIENT_PUBLIC_IP_HEADER', 'bad header name');
    vi.stubEnv('HMRC_CLIENT_PUBLIC_PORT_HEADER', 'x-pi-client-port');
    const headers = await buildFraudPreventionHeaders({}, new Request('https://example.test/api', {
      headers: { 'x-pi-client-port': '443junk' },
    }));

    expect(headers).not.toHaveProperty('Gov-Client-Public-IP');
    expect(headers).not.toHaveProperty('Gov-Client-Public-IP-Timestamp');
    expect(headers).not.toHaveProperty('Gov-Client-Public-Port');
  });
});
