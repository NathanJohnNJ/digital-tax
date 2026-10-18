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
      headers: {
        'x-forwarded-for': '198.51.100.25',
        'x-real-ip': '198.51.100.26',
      },
    });

    expect(getTrustedClientIp(request)).toBeUndefined();
  });

  it('uses the first x-forwarded-for entry and rejects malformed values', () => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': '198.51.100.25, 203.0.113.10' },
    });

    expect(getTrustedClientIp(request)).toBe('198.51.100.25');
    expect(getTrustedClientIp(new Request('https://example.test/api', {
      headers: { 'x-forwarded-for': 'not-an-ip' },
    }))).toBeUndefined();
  });

  it('falls back to a valid platform IP when the forwarded address is invalid', () => {
    const request = new Request('https://example.test/api', {
      headers: {
        'x-forwarded-for': 'not-an-ip, 203.0.113.10',
        'x-real-ip': '198.51.100.26',
      },
    });

    expect(getTrustedClientIp(request)).toBe('198.51.100.26');
  });

  it('rejects an invalid platform IP fallback', () => {
    const request = new Request('https://example.test/api', {
      headers: {
        'x-forwarded-for': 'not-an-ip',
        'x-real-ip': 'not-an-ip-either',
      },
    });

    expect(getTrustedClientIp(request)).toBeUndefined();
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
        headers: { 'x-forwarded-for': '198.51.100.25, 203.0.113.10' },
      }),
    );

    expect(headers['Gov-Client-Public-IP']).toBe('198.51.100.25');
    expect(headers['Gov-Client-Public-IP']).not.toBe('203.0.113.50');
    expect(headers['Gov-Client-Public-IP-Timestamp']).not.toBe('2000-01-01T00:00:00.000Z');
    expect(headers['Gov-Vendor-Forwarded']).toBe('by=192.0.2.10&for=198.51.100.25');
  });

  it('fails instead of returning headers without a trusted client IP', async () => {
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
        headers: { 'x-forwarded-for': 'not-an-ip' },
      }),
    )).rejects.toThrow('Unable to resolve a trusted client public IP');
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
        headers: { 'x-forwarded-for': '198.51.100.25, 203.0.113.10' },
      }),
    );

    expect(headers['Gov-Client-Public-IP']).toBe('198.51.100.25');
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
        headers: { 'x-forwarded-for': '198.51.100.25' },
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
        headers: { 'x-forwarded-for': '198.51.100.25' },
      }),
    )).rejects.toThrow('Unable to resolve a valid vendor public IP');
  });
});
