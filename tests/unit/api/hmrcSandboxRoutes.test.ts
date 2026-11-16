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
  let getServicesAction: typeof import('@/app/actions/getServicesAction').getServicesAction;
  let fraudValidationPost: typeof import('@/app/api/hmrc/fraud/test/route').POST;
  let ipDiagnosticsPost: typeof import('@/app/api/hmrc/fraud/ip-diagnostics/route').POST;

  beforeAll(async () => {
    vi.stubEnv('TESTING_ALLOWED_USER_EMAILS', 'sandbox-tester@example.com');
    vi.resetModules();
    const [createUserRoute, fraudRoute, ipDiagnosticsRoute, servicesModule] = await Promise.all([
      import('@/app/api/hmrc/applicationRestrictedAuth/createTestUser/route'),
      import('@/app/api/hmrc/fraud/test/route'),
      import('@/app/api/hmrc/fraud/ip-diagnostics/route'),
      import('@/app/actions/getServicesAction'),
    ]);
    createTestUserPost = createUserRoute.POST;
    fraudValidationPost = fraudRoute.POST;
    ipDiagnosticsPost = ipDiagnosticsRoute.POST;
    getServicesAction = servicesModule.getServicesAction;
  });

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('HMRC_ENABLE_SANDBOX_TEST_TOOLS', '');
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
    vi.unstubAllEnvs();
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
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(fetch).toHaveBeenCalledWith(
      'https://test-api.service.hmrc.gov.uk/create-test-user/individuals',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/vnd.hmrc.1.0+json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-access-token',
        }),
        body: JSON.stringify({ serviceNames: ['self-assessment'] }),
      }),
    );
  });

  it('denies both test-user tools by default in production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', {
      serviceNamesList: ['mtd-income-tax'],
    }));

    expect(response.status).toBe(403);
    expect(await getServicesAction()).toMatchObject({ ok: false, status: 403 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('allows an allowlisted tester to use both Sandbox tools when enabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('HMRC_ENABLE_SANDBOX_TEST_TOOLS', 'true');
    const services = [{ key: 'mtd-income-tax', name: 'MTD Income Tax', allowedUserTypes: ['individual'] }];
    vi.mocked(fetch)
      .mockResolvedValueOnce(hmrcResponse({ userId: 'example' }, 201))
      .mockResolvedValueOnce(hmrcResponse(services, 200));

    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', {
      serviceNamesList: ['mtd-income-tax'],
    }));
    expect(response.status).toBe(201);
    expect(await getServicesAction()).toEqual({ ok: true, services });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://test-api.service.hmrc.gov.uk/create-test-user/services',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/vnd.hmrc.1.0+json' }),
      }),
    );
  });

  it('denies non-allowlisted users even when production Sandbox tools are enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('HMRC_ENABLE_SANDBOX_TEST_TOOLS', 'true');
    getSessionMock.mockResolvedValue({ user: { email: 'other@example.com' } });

    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', {
      serviceNamesList: ['mtd-income-tax'],
    }));
    expect(response.status).toBe(403);
    expect(await getServicesAction()).toMatchObject({ ok: false, status: 403 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { serviceNamesList: [] },
    { serviceNamesList: ['unknown-service'] },
    { serviceNamesList: ['mtd-income-tax', 'mtd-income-tax'] },
    { serviceNamesList: [123] },
  ])('rejects invalid service selections before calling HMRC: %j', async (body) => {
    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', body));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before calling HMRC', async () => {
    const response = await createTestUserPost(new NextRequest('http://localhost/api/test-user', {
      method: 'POST',
      body: '{',
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves test-user creation errors without logging the response body', async () => {
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
    });
  });

  it('reports a Sandbox network failure without leaking its details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockRejectedValueOnce(new Error('private connection details'));
    const response = await createTestUserPost(postRequest('http://localhost/api/test-user', {
      serviceNamesList: ['mtd-income-tax'],
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Unable to reach HMRC Sandbox. Please try again later.' });
    expect(consoleError).toHaveBeenCalledWith('HMRC Sandbox test-user creation request failed', {
      errorName: 'Error',
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
    vi.mocked(buildFraudPreventionHeaders).mockResolvedValueOnce({
      'Gov-Client-Public-IP': '198.51.100.25',
      'Gov-Vendor-Public-IP': '203.0.113.10',
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
    } as Awaited<ReturnType<typeof buildFraudPreventionHeaders>>);

    const response = await fraudValidationPost(postRequest('http://localhost/api/fraud-test', {
      connectionMethod: 'WEB_APP_VIA_SERVER',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validationResult);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(
      JSON.parse(Buffer.from(response.headers.get('X-Fraud-Prevention-Headers') ?? '', 'base64').toString('utf8')),
    ).toEqual({
      'Gov-Client-Public-IP': '198.51.100.25',
      'Gov-Vendor-Public-IP': '203.0.113.10',
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://test-api.service.hmrc.gov.uk/test/fraud-prevention-headers/validate',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.hmrc.1.0+json',
          'Gov-Client-Public-IP': '198.51.100.25',
          'Gov-Vendor-Public-IP': '203.0.113.10',
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
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
    } as Awaited<ReturnType<typeof buildFraudPreventionHeaders>>);
    vi.stubEnv('SERVER_PUBLIC_IP', '203.0.113.10');
    vi.stubEnv('WAF_PUBLIC_IP', '');
    vi.stubEnv('SERVER2_PUBLIC_IP', '');
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ip: '203.0.113.11' }));

    const response = await ipDiagnosticsPost(postRequest('https://example.test/api/ip-diagnostics', {
      clientData: { connectionMethod: 'WEB_APP_VIA_SERVER' },
    }));

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
