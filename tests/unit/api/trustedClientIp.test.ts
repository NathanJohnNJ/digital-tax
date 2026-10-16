import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFraudPreventionHeaders } from '@/app/api/utils/buildFraudPreventionHeaders';
import { getTrustedClientIp } from '@/app/api/utils/getTrustedClientIp';

describe('trusted client IP', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL', '1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ['IPv4', '198.51.100.25'],
    ['IPv6', '2001:db8::25'],
  ])('accepts a single valid Vercel x-forwarded-for %s address', (_label, ip) => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': ip },
    });

    expect(getTrustedClientIp(request)).toBe(ip);
  });

  it('does not trust x-forwarded-for outside Vercel', () => {
    vi.stubEnv('VERCEL', '');
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': '198.51.100.25' },
    });

    expect(getTrustedClientIp(request)).toBeUndefined();
  });

  it('rejects lists and malformed values instead of forwarding unsanitized data', () => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': '198.51.100.25, 203.0.113.10' },
    });

    expect(getTrustedClientIp(request)).toBeUndefined();
    expect(getTrustedClientIp(new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': 'not-an-ip' },
    }))).toBeUndefined();
  });

  it('does not use a forged body IP when building HMRC headers', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SERVER_PUBLIC_IP', '192.0.2.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ ip: '192.0.2.20' }),
    ));

    const headers = await buildFraudPreventionHeaders(
      { publicIP: '203.0.113.50', publicIPTimestamp: '2000-01-01T00:00:00.000Z' },
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': '198.51.100.25' },
      }),
    );

    expect(headers['Gov-Client-Public-IP']).toBe('198.51.100.25');
    expect(headers['Gov-Client-Public-IP']).not.toBe('203.0.113.50');
    expect(headers['Gov-Client-Public-IP-Timestamp']).not.toBe('2000-01-01T00:00:00.000Z');
    expect(headers['Gov-Vendor-Forwarded']).toBe('by=192.0.2.10&for=198.51.100.25');
  });

  it('omits the client IP header when no valid platform IP is available', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SERVER_PUBLIC_IP', '192.0.2.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ ip: '192.0.2.20' }),
    ));

    const headers = await buildFraudPreventionHeaders(
      { publicIP: '203.0.113.50' },
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': 'not-an-ip' },
      }),
    );

    expect(headers).not.toHaveProperty('Gov-Client-Public-IP');
    expect(headers).not.toHaveProperty('Gov-Client-Public-IP-Timestamp');
    expect(headers['Gov-Vendor-Forwarded']).toBe('');
  });
});
