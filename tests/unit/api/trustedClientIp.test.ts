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

  it('accepts a public IPv4 Vercel x-forwarded-for address', () => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': '8.8.8.8' },
    });

    expect(getTrustedClientIp(request)).toBe('8.8.8.8');
  });

  it.each([
    '::1',
    '2001:db8::25',
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.0.2.10',
    '192.168.1.1',
    '198.51.100.25',
  ])('rejects a non-public IPv4 value or IPv6 value: %s', (ip) => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': ip },
    });

    expect(getTrustedClientIp(request)).toBe('');
  });

  it('does not trust x-forwarded-for outside Vercel', () => {
    vi.stubEnv('VERCEL', '');
    const request = new Request('https://example.test/api', {
      headers: {
        'x-forwarded-for': '8.8.8.8',
        'x-real-ip': 'not-an-ip',
      },
    });

    expect(getTrustedClientIp(request)).toBe('');
  });

  it('uses the first x-forwarded-for entry and rejects malformed values', () => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1' },
    });

    expect(getTrustedClientIp(request)).toBe('8.8.8.8');
    expect(getTrustedClientIp(new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': 'not-an-ip' },
    }))).toBe('');
  });

  it('falls back to a valid platform IP when the forwarded address is invalid', () => {
    const request = new Request('https://example.test/api', {
      headers: {
        'x-forwarded-for': 'not-an-ip, 1.1.1.1',
        'x-real-ip': '8.8.8.8',
      },
    });

    expect(getTrustedClientIp(request)).toBe('8.8.8.8');
  });

  it('rejects an invalid platform IP fallback', () => {
    const request = new Request('https://example.test/api', {
      headers: {
        'x-forwarded-for': 'not-an-ip',
        'x-real-ip': 'not-an-ip-either',
      },
    });

    expect(getTrustedClientIp(request)).toBe('');
  });

  it('does not use a forged body IP when building HMRC headers', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SERVER_PUBLIC_IP', '192.0.2.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ip: '192.0.2.20' })));

    const headers = await buildFraudPreventionHeaders(
      { publicIP: '203.0.113.50', publicIPTimestamp: '2000-01-01T00:00:00.000Z' },
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': '8.8.8.8, 203.0.113.10' },
      }),
    );

    expect(headers['Gov-Client-Public-IP']).toBe('8.8.8.8');
    expect(headers['Gov-Client-Public-IP']).not.toBe('203.0.113.50');
    expect(headers['Gov-Client-Public-IP-Timestamp']).not.toBe('2000-01-01T00:00:00.000Z');
    expect(headers['Gov-Vendor-Forwarded']).toBe('by=192.0.2.10&for=8.8.8.8');
  });

  it('fails instead of returning headers without a public IPv4 client IP', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SERVER_PUBLIC_IP', '192.0.2.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ ip: '192.0.2.20' }),
    ));

    await expect(buildFraudPreventionHeaders(
      { publicIP: '203.0.113.50' },
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': '::1' },
      }),
    )).rejects.toThrow('Unable to resolve a public IPv4 client address');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('always sets both public IP headers from the diagnostic IP resolution sources', async () => {
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
      {},
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': '8.8.8.8, 203.0.113.10' },
      }),
    );

    expect(headers['Gov-Client-Public-IP']).toBe('8.8.8.8');
    expect(headers['Gov-Vendor-Public-IP']).toBe('192.0.2.20');
    expect(headers['Gov-Client-Public-IP']).not.toBe('');
    expect(headers['Gov-Vendor-Public-IP']).not.toBe('');
  });

  it('uses a validated configured server IP when the vendor IP lookup fails', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SERVER_PUBLIC_IP', '192.0.2.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ error: 'unavailable' }, { status: 503 }),
    ));

    const headers = await buildFraudPreventionHeaders(
      {},
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': '8.8.8.8' },
      }),
    );

    expect(headers['Gov-Vendor-Public-IP']).toBe('192.0.2.10');
  });

  it('fails instead of returning an empty vendor IP when lookup and fallback are invalid', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SERVER_PUBLIC_IP', 'not-an-ip');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.stubEnv('APP_NAME', 'Digital Tax');
    vi.stubEnv('LICENSE_KEY', 'test-license');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ ip: 'not-an-ip' }),
    ));

    await expect(buildFraudPreventionHeaders(
      {},
      new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': '8.8.8.8' },
      }),
    )).rejects.toThrow('Unable to resolve a valid vendor public IP');
  });
});
