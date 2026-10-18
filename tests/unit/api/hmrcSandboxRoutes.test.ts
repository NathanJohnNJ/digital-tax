import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { buildFraudPreventionHeaders } from '@/app/api/utils/buildFraudPreventionHeaders';

const { cookieStore, getSessionMock } = vi.hoisted(() => ({
  cookieStore: {
    has: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  getSessionMock: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/auth0', () => ({ auth0: { getSession: getSessionMock } }));
vi.mock('@/app/api/utils/buildFraudPreventionHeaders', () => ({
  buildFraudPreventionHeaders: vi.fn(),
}));
vi.mock('@/app/actions/requestAppAccessToken', () => ({
  requestAppAccessToken: vi.fn(),
}));

function postRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function hmrcResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HMRC Sandbox support routes', () => {
  let createTestUserPost: typeof import('@/app/api/hmrc/applicationRestrictedAuth/createTestUser/route').POST;
  let fraudValidationPost: typeof import('@/app/api/hmrc/fraud/test/route').POST;
  let ipDiagnosticsGet: typeof import('@/app/api/hmrc/fraud/ip-diagnostics/route').GET;

  beforeAll(async () => {
    vi.stubEnv('TESTING_ALLOWED_USER_EMAILS', 'sandbox-tester@example.com');
    vi.resetModules();
    const [createUserRoute, fraudRoute, ipDiagnosticsRoute] = await Promise.all([
      import('@/app/api/hmrc/applicationRestrictedAuth/createTestUser/route'),
      import('@/app/api/hmrc/fraud/test/route'),
      import('@/app/api/hmrc/fraud/ip-diagnostics/route'),
    ]);
    createTestUserPost = createUserRoute.POST;
    fraudValidationPost = fraudRoute.POST;
    ipDiagnosticsGet = ipDiagnosticsRoute.GET;
  });

  beforeEach(() => {
    cookieStore.has.mockReturnValue(true);
    cookieStore.get.mockReturnValue({ value: 'test-access-token' });
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    getSessionMock.mockResolvedValue({ user: { email: 'sandbox-tester@example.com' } });
    vi.mocked(buildFraudPreventionHeaders).mockResolvedValue({
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
    } as Awaited<ReturnType<typeof buildFraudPreventionHeaders>>);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('preserves the test-user creation response body and 201 status', async () => {
    const payload = { userId: 'user-123', password: 'example-password' };
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(payload, 201));

    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', {
      serviceNamesList: ['self-assessment'],
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(payload);
  });

  it('preserves test-user creation errors and logs HMRC response details', async () => {
    const errorBody = { code: 'INVALID_REQUEST', message: 'Requested service is unavailable' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(errorBody, 400));

    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', {
      serviceNamesList: ['self-assessment'],
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(errorBody);
    expect(consoleError).toHaveBeenCalledWith('HMRC test-user creation failed', {
      status: 400,
      body: JSON.stringify(errorBody),
    });
  });

  it('preserves fraud-header validation errors and logs HMRC response details', async () => {
    const errorBody = { code: 'INVALID_HEADERS', message: 'A fraud-prevention header is invalid' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(errorBody, 400));

    const response = await fraudValidationPost(postRequest('http://localhost/api/fraud-test', {
      connectionMethod: 'WEB_APP_VIA_SERVER',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(errorBody);
    expect(consoleError).toHaveBeenCalledWith('HMRC fraud-header validation failed', {
      status: 400,
      body: JSON.stringify(errorBody),
    });
  });

  it("sends generated fraud headers to HMRC's request validation endpoint", async () => {
    const validationResult = {
      specVersion: '3.1',
      code: 'VALID_HEADERS',
      message: 'All headers appear to be valid',
    };
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(validationResult, 200));

    const response = await fraudValidationPost(postRequest('http://localhost/api/fraud-test', {
      connectionMethod: 'WEB_APP_VIA_SERVER',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validationResult);
    expect(fetch).toHaveBeenCalledWith(
      'https://test-api.service.hmrc.gov.uk/test/fraud-prevention-headers/validate',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.hmrc.1.0+json',
          'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
        }),
      }),
    );
  });

  it('does not call HMRC for a user outside the testing allowlist', async () => {
    getSessionMock.mockResolvedValueOnce({ user: { email: 'other@example.com' } });

    const response = await fraudValidationPost(postRequest('http://localhost/api/fraud-test', {
      connectionMethod: 'WEB_APP_VIA_SERVER',
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns app-derived and IP-API server values to allowlisted testers', async () => {
    vi.mocked(buildFraudPreventionHeaders).mockResolvedValueOnce({
      'Gov-Client-Public-IP': '198.51.100.25',
      'Gov-Vendor-Public-IP': '203.0.113.10',
      'Gov-Vendor-Forwarded': 'by=203.0.113.10&for=198.51.100.25',
    } as Awaited<ReturnType<typeof buildFraudPreventionHeaders>>);
    vi.stubEnv('SERVER_PUBLIC_IP', '203.0.113.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ip: '203.0.113.11' }));

    const response = await ipDiagnosticsGet(new NextRequest('https://example.test/api/ip-diagnostics'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      application: {
        clientPublicIp: '198.51.100.25',
        vendorPublicIp: '203.0.113.10',
        vendorForwarded: 'by=203.0.113.10&for=198.51.100.25',
        configuredServerIps: {
          server: '203.0.113.10',
          waf: null,
          server2: null,
        },
      },
      ipApi: {
        serverPublicIp: '203.0.113.11',
        serverError: null,
      },
    });
  });
});
