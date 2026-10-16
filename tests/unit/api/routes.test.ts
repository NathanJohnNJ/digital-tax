import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as quarterlyObligationsPost } from '../../../app/api/hmrc/userRestrictedAuth/obligations/quarterly/route';
import { POST as businessDetailsPost } from '../../../app/api/hmrc/userRestrictedAuth/businessDetails/route';
import { POST as businessListPost } from '../../../app/api/hmrc/userRestrictedAuth/businessList/route';
import { GET as databaseGet, POST as databasePost } from '../../../app/api/db/route';
import { GET as cookiesGet, POST as cookiesPost } from '../../../app/api/cookies/route';
import { cookies } from 'next/headers';
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';
import { buildFraudPreventionHeaders } from '@/app/api/utils/buildFraudPreventionHeaders';
import { pool } from '@/lib/db';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/app/actions/requestUserAccessToken', () => ({ requestUserAccessToken: vi.fn() }));
vi.mock('@/app/api/utils/buildFraudPreventionHeaders', () => ({ buildFraudPreventionHeaders: vi.fn() }));
vi.mock('@/lib/db', () => ({ pool: { query: queryMock } }));

const cookieStore = {
  has: vi.fn(),
  get: vi.fn(),
  set: vi.fn()
};

function createPostRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });
}

function createHmrcResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('API route handlers', () => {
  beforeEach(() => {
    cookieStore.has.mockReturnValue(true);
    cookieStore.get.mockReturnValue({ value: 'test-access-token' });
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(buildFraudPreventionHeaders).mockResolvedValue({
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER'
    } as Awaited<ReturnType<typeof buildFraudPreventionHeaders>>);
    vi.mocked(requestUserAccessToken).mockResolvedValue({
      ok: true,
      tokens: { access_token: 'test-access-token', expires_in: 3600 }
    });
    queryMock.mockResolvedValue({ rows: [] });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the quarterly HMRC request from the selected tax year', async () => {
    const responsePayload = { obligations: [] };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(createHmrcResponse(responsePayload));

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: { browserUserAgent: 'test' },
      nino: 'AB123456C',
      businessId: 'XBIS123',
      taxYear: '2018-19'
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(responsePayload);
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestUrl.pathname).toContain('/obligations/details/AB123456C/income-and-expenditure');
    expect(requestUrl.searchParams.get('businessId')).toBe('XBIS123');
    expect(requestUrl.searchParams.get('typeOfBusiness')).toBe('self-employment');
    expect(requestUrl.searchParams.get('fromDate')).toBe('2018-04-06');
    expect(requestUrl.searchParams.get('toDate')).toBe('2019-04-05');
    expect(new Headers(requestOptions.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('returns HMRC quarterly errors with their upstream status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse({ message: 'Not authorised' }, 403));

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: {}, nino: 'AB123456C', businessId: 'XBIS123', taxYear: '2018-19'
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Not authorised', status: 403 });
  });

  it('returns the token action error without calling HMRC', async () => {
    cookieStore.has.mockReturnValue(false);
    vi.mocked(requestUserAccessToken).mockResolvedValue({
      ok: false,
      status: 401,
      body: { error: 'Authentication required' }
    });

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: {}, nino: 'AB123456C', businessId: 'XBIS123', taxYear: '2018-19'
    }));

    expect(response.status).toBe(401);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns a server error when the HMRC request fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: {}, nino: 'AB123456C', businessId: 'XBIS123', taxYear: '2018-19'
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'network unavailable' });
    consoleError.mockRestore();
  });

  it('preserves the status and response body returned by HMRC for business details', async () => {
    const details = { businessId: 'XBIS123', tradingName: 'Example Design' };
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse(details));

    const successResponse = await businessDetailsPost(createPostRequest('http://localhost/api/business-details', {
      clientData: {}, nino: 'AB123456C', businessID: 'XBIS123'
    }));
    expect(successResponse.status).toBe(200);
    expect(await successResponse.json()).toEqual(details);

    const hmrcError = {
      code: 'MATCHING_RESOURCE_NOT_FOUND',
      message: 'Business not found',
      errors: [{ code: 'NOT_FOUND', message: 'No business matches the supplied ID' }]
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse(hmrcError, 404, {
      'Content-Type': 'application/json',
      'X-CorrelationId': 'correlation-123'
    }));
    const errorResponse = await businessDetailsPost(createPostRequest('http://localhost/api/business-details', {
      clientData: {}, nino: 'AB123456C', businessID: 'missing'
    }));
    expect(errorResponse.status).toBe(404);
    expect(await errorResponse.json()).toEqual(hmrcError);
    expect(errorResponse.headers.get('X-CorrelationId')).toBe('correlation-123');
    expect(consoleError).toHaveBeenCalledWith('HMRC business details request failed', {
      status: 404,
      correlationId: 'correlation-123',
      code: 'MATCHING_RESOURCE_NOT_FOUND',
      errorCodes: ['NOT_FOUND']
    });
    consoleError.mockRestore();
  });

  it('returns a safe gateway error and logs network failures for business details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));

    const response = await businessDetailsPost(createPostRequest('http://localhost/api/business-details', {
      clientData: {}, nino: 'AB123456C', businessID: 'XBIS123'
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Unable to retrieve business details from HMRC. Please try again later.'
    });
    expect(consoleError).toHaveBeenCalledWith('HMRC business details request could not be completed', {
      errorName: 'Error',
      errorMessage: 'network unavailable'
    });
    consoleError.mockRestore();
  });

  it('returns business-list errors with their upstream status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse({ message: 'Rate limited' }, 429));

    const response = await businessListPost(createPostRequest('http://localhost/api/business-list', {
      clientData: {}, nino: 'AB123456C'
    }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Rate limited', status: 429 });
  });

  it('updates and reads the user database record', async () => {
    const postResponse = await databasePost(createPostRequest('http://localhost/api/db', {
      nino: 'AB123456C', sub: 'auth0|user-123'
    }));
    expect(postResponse.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), ['AB123456C', 'auth0|user-123']);

    queryMock.mockResolvedValueOnce({ rows: [{ auth_id: 'auth0|user-123', ni_number: 'AB123456C' }] });
    const getRequest = new NextRequest('http://localhost/api/db?id=auth0%7Cuser-123');
    const getResponse = await databaseGet(getRequest);
    expect(await getResponse.json()).toEqual({ auth_id: 'auth0|user-123', ni_number: 'AB123456C' });
  });

  it('returns a database error when saving the user record fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('database unavailable'));
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const response = await databasePost(createPostRequest('http://localhost/api/db', {
      nino: 'AB123456C', sub: 'auth0|user-123'
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'DB update failed' });
    consoleLog.mockRestore();
  });

  it('persists cookie preferences to the cookie store and database', async () => {
    const postResponse = await cookiesPost(createPostRequest('http://localhost/api/cookies?id=auth0%7Cuser-123', {
      selected: ['essential', 'analytics']
    }));

    expect(postResponse.status).toBe(200);
    expect(cookieStore.set).toHaveBeenCalledWith('allow_cookies', '["essential","analytics"]', expect.objectContaining({
      httpOnly: true,
      secure: true
    }));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), ['["essential","analytics"]', 'auth0|user-123']);
  });

  it('loads cookie preferences from the database', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ allow_cookies: '["essential"]' }] });

    const response = await cookiesGet(new NextRequest('http://localhost/api/cookies?id=auth0%7Cuser-123'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 200, allowCookies: '["essential"]' });
    expect(cookieStore.set).toHaveBeenCalledWith('allow_cookies', '["essential"]', expect.objectContaining({ secure: true }));
  });
});