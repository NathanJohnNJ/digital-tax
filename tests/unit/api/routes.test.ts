import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as quarterlyObligationsPost } from '../../../app/api/hmrc/userRestrictedAuth/obligations/quarterly/route';
import { POST as businessDetailsPost } from '../../../app/api/hmrc/userRestrictedAuth/businessDetails/route';
import { POST as businessListPost } from '../../../app/api/hmrc/userRestrictedAuth/businessList/route';
import { POST as recordsImportPost } from '../../../app/api/records/import/route';
import { GET as recordsExportGet } from '../../../app/api/records/export/route';
import { GET as databaseGet, POST as databasePost } from '../../../app/api/db/route';
import { GET as cookiesGet, POST as cookiesPost } from '../../../app/api/cookies/route';
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from '../../../app/api/utils/buildFraudPreventionHeaders';
import { pool } from '../../../lib/db';
import { getAuthenticatedAppUser } from '../../../lib/appUser';
import { getCurrentHmrcAccessToken } from '../../../lib/hmrcTokens';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('../../../app/api/utils/buildFraudPreventionHeaders', () => ({ buildFraudPreventionHeaders: vi.fn() }));
vi.mock('../../../lib/appUser', () => ({ getAuthenticatedAppUser: vi.fn() }));
vi.mock('../../../lib/hmrcTokens', () => ({
  getCurrentHmrcAccessToken: vi.fn(),
  markCurrentHmrcAuthorizationRequired: vi.fn(),
}));
vi.mock('../../../lib/db', () => ({ pool: { query: queryMock } }));

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
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(buildFraudPreventionHeaders).mockResolvedValue({
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER'
    } as Awaited<ReturnType<typeof buildFraudPreventionHeaders>>);
    vi.mocked(getCurrentHmrcAccessToken).mockResolvedValue({ ok: true, accessToken: 'test-access-token' });
    vi.mocked(getAuthenticatedAppUser).mockResolvedValue({ id: '123' });
    queryMock.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
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
      businessId: 'XBIS12345678901',
      taxYear: '2018-19'
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(responsePayload);
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestUrl.pathname).toContain('/obligations/details/AB123456C/income-and-expenditure');
    expect(requestUrl.searchParams.get('businessId')).toBe('XBIS12345678901');
    expect(requestUrl.searchParams.get('typeOfBusiness')).toBe('self-employment');
    expect(requestUrl.searchParams.get('fromDate')).toBe('2018-04-06');
    expect(requestUrl.searchParams.get('toDate')).toBe('2019-04-05');
    expect(new Headers(requestOptions.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('returns HMRC quarterly errors with their upstream status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse({ message: 'Not authorised' }, 403));

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: {}, nino: 'AB123456C', businessId: 'XBIS12345678901', taxYear: '2018-19'
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Not authorised',
      status: 403,
      details: { message: 'Not authorised' }
    });
  });

  it('returns the stored-token error without calling HMRC', async () => {
    vi.mocked(getCurrentHmrcAccessToken).mockResolvedValue({
      ok: false,
      status: 401,
      error: 'HMRC authorization is required',
    });

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: {}, nino: 'AB123456C', businessId: 'XBIS12345678901', taxYear: '2018-19'
    }));

    expect(response.status).toBe(401);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns a server error when the HMRC request fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await quarterlyObligationsPost(createPostRequest('http://localhost/api/quarterly', {
      clientData: {}, nino: 'AB123456C', businessId: 'XBIS12345678901', taxYear: '2018-19'
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Unable to retrieve quarterly obligations from HMRC. Please try again later.'
    });
    consoleError.mockRestore();
  });

  it('preserves the status and response body returned by HMRC for business details', async () => {
    const details = {
      businessId: 'XBIS12345678901',
      typeOfBusiness: 'self-employment',
      tradingName: 'Example Design'
    };
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse(details));

    const successResponse = await businessDetailsPost(createPostRequest('http://localhost/api/business-details', {
      clientData: {}, nino: 'AB123456C', businessID: 'XBIS12345678901'
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
      clientData: {}, nino: 'AB123456C', businessID: 'XBIS00000000000'
    }));
    expect(errorResponse.status).toBe(404);
    expect(await errorResponse.json()).toEqual({
      error: hmrcError.message,
      status: 404,
      details: hmrcError
    });
    expect(errorResponse.headers.get('X-CorrelationId')).toBe('correlation-123');
    expect(consoleError).toHaveBeenCalledWith('HMRC business details request failed', {
      status: 404,
      correlationId: 'correlation-123',
      code: 'MATCHING_RESOURCE_NOT_FOUND',
    });
    consoleError.mockRestore();
  });

  it('returns a safe gateway error and logs network failures for business details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));

    const response = await businessDetailsPost(createPostRequest('http://localhost/api/business-details', {
      clientData: {}, nino: 'AB123456C', businessID: 'XBIS12345678901'
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Unable to retrieve business details from HMRC. Please try again later.'
    });
    expect(consoleError).toHaveBeenCalledWith('HMRC business details request could not be completed', {
      errorName: 'Error',
    });
    consoleError.mockRestore();
  });

  it('returns business-list errors with their upstream status', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ni_number: 'AB123456C' }], rowCount: 1 });
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse({ message: 'Rate limited' }, 429));

    const response = await businessListPost(createPostRequest('http://localhost/api/business-list', {
      clientData: {}, nino: 'AB123456C'
    }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: 'Rate limited',
      status: 429,
      details: { message: 'Rate limited' }
    });
  });

  it('stores only businesses returned by HMRC for the authenticated account', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ni_number: 'AB123456C' }], rowCount: 1 });
    const businesses = {
      listOfBusinesses: [
        { businessId: 'XBIS12345678901', typeOfBusiness: 'self-employment', tradingName: 'Design' },
        { businessId: 'XBIS12345678902', typeOfBusiness: 'foreign-property' },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(createHmrcResponse(businesses));

    const response = await businessListPost(createPostRequest('http://localhost/api/business-list', {
      clientData: {}, nino: 'AB123456C'
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(businesses);
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO public.record_businesses'),
      [
        '123',
        JSON.stringify([
          { businessId: 'XBIS12345678901', typeOfBusiness: 'self-employment', tradingName: 'Design' },
          { businessId: 'XBIS12345678902', typeOfBusiness: 'foreign-property', tradingName: null },
        ]),
      ],
    );
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET is_active = false'),
      expect.anything(),
    );
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('"businessId" AS business_id'),
      expect.anything(),
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('/AB123456C/list');
  });

  it('does not request another person’s business list using a client-submitted NINO', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ni_number: 'CD123456A' }], rowCount: 1 });

    const response = await businessListPost(createPostRequest('http://localhost/api/business-list', {
      clientData: {}, nino: 'AB123456C'
    }));

    expect(response.status).toBe(400);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('previews CSV imports only for verified account businesses and returns a content-bound batch', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          type_of_business: 'self-employment',
          hmrc_business_id: 'XBIS12345678901',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await recordsImportPost(createPostRequest('http://localhost/api/records/import', {
      mode: 'preview',
      recordBusinessId: '11111111-1111-4111-8111-111111111111',
      csvText: 'date,type,category,amount,currency,gbp\n2026-04-08,income,turnover,125.50,GBP,125.50',
      columnMap: {
        recordDate: 'date',
        recordType: 'type',
        category: 'category',
        sourceAmount: 'amount',
        sourceCurrency: 'currency',
        amountGbp: 'gbp',
      },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      totalRows: 1,
      validRows: 1,
      rows: [{ rowNumber: 2, record: { recordDate: '2026-04-08', category: 'turnover', amountGbp: '125.50' } }],
      possibleDuplicates: [],
      requiresDuplicateConfirmation: false,
    });
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('jsonb_to_recordset'),
      [
        '123',
        '11111111-1111-4111-8111-111111111111',
        JSON.stringify([{
          row_number: 2,
          record_date: '2026-04-08',
          record_type: 'income',
          category: 'turnover',
          source_amount: '125.50',
          source_currency: 'GBP',
        }]),
      ],
    );
  });

  it('accepts the published example CSV with the documented mapping', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          type_of_business: 'self-employment',
          hmrc_business_id: 'XBIS12345678901',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const csvText = readFileSync('public/examples/self-employment-records.csv', 'utf8');
    const response = await recordsImportPost(createPostRequest('http://localhost/api/records/import', {
      mode: 'preview',
      recordBusinessId: '11111111-1111-4111-8111-111111111111',
      csvText,
      columnMap: {
        recordDate: 'recordDate',
        recordType: 'recordType',
        category: 'category',
        description: 'description',
        sourceAmount: 'sourceAmount',
        sourceCurrency: 'sourceCurrency',
        amountGbp: 'amountGbp',
      },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ totalRows: 2, validRows: 2 });
  });

  it('accepts a completed row using the downloadable blank template', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          type_of_business: 'self-employment',
          hmrc_business_id: 'XBIS12345678901',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const template = readFileSync('public/examples/digital-records-template.csv', 'utf8');
    const response = await recordsImportPost(createPostRequest('http://localhost/api/records/import', {
      mode: 'preview',
      recordBusinessId: '11111111-1111-4111-8111-111111111111',
      csvText: `${template}2026-04-08,income,turnover,Customer invoice,125.50,GBP,125.50,,,,,\n`,
      columnMap: {
        recordDate: 'recordDate',
        recordType: 'recordType',
        category: 'category',
        description: 'description',
        sourceAmount: 'sourceAmount',
        sourceCurrency: 'sourceCurrency',
        amountGbp: 'amountGbp',
        exchangeRate: 'exchangeRate',
        exchangeRateDate: 'exchangeRateDate',
        exchangeRateSource: 'exchangeRateSource',
        foreignPropertyId: 'foreignPropertyId',
        foreignPropertyCountryCode: 'foreignPropertyCountryCode',
      },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ totalRows: 1, validRows: 1 });
  });

  it('rejects committing an import whose content no longer matches the preview', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          type_of_business: 'self-employment',
          hmrc_business_id: 'XBIS12345678901',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await recordsImportPost(createPostRequest('http://localhost/api/records/import', {
      mode: 'commit',
      batchId: '22222222-2222-4222-8222-222222222222',
      contentSha256: 'not-the-preview-hash',
      recordBusinessId: '11111111-1111-4111-8111-111111111111',
      csvText: 'date,type,category,amount,currency,gbp\n2026-04-08,income,turnover,125.50,GBP,125.50',
      columnMap: {
        recordDate: 'date',
        recordType: 'type',
        category: 'category',
        sourceAmount: 'amount',
        sourceCurrency: 'currency',
        amountGbp: 'gbp',
      },
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Import data or mapping changed after preview; preview it again',
    });
  });

  it('exports complete record and history data as correctly escaped, user-scoped CSV', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        record_id: '33333333-3333-4333-8333-333333333333',
        record_business_id: '11111111-1111-4111-8111-111111111111',
        hmrc_business_id: 'XBIS12345678901',
        business_type: 'self-employment',
        trading_name: 'Design',
        record_date: '2026-04-08',
        record_type: 'income',
        category: 'turnover',
        description: 'Invoice, "A"',
        source_amount: '125.50',
        source_currency: 'GBP',
        amount_gbp: '125.50',
        exchange_rate: null,
        exchange_rate_date: null,
        exchange_rate_source: null,
        foreign_property_id: null,
        foreign_property_country_code: null,
        version: 1,
        created_at: '2026-04-08T10:00:00.000Z',
        updated_at: '2026-04-08T10:00:00.000Z',
        archived_at: null,
        history_json: [{ action: 'created', version: 1 }],
        submission_references_json: [],
      }],
    });

    const request = new NextRequest('http://localhost/api/records/export?taxYear=2026-27');
    const response = await recordsExportGet(request);
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(csv).toContain('"Invoice, ""A"""');
    expect(csv).toContain('[{""action"":""created"",""version"":1}]');
    expect(csv.split('\r\n')[0]).toContain('submission_references_json');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE r.user_id = $1 AND r.record_date >= $2 AND r.record_date <= $3'),
      ['123', '2026-04-06', '2027-04-05', 500],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('r.record_date::text AS record_date'),
      expect.any(Array),
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('r.exchange_rate_date::text AS exchange_rate_date'),
      expect.any(Array),
    );
  });

  it('rejects ambiguous tax-year and date-range export filters', async () => {
    const response = await recordsExportGet(
      new NextRequest('http://localhost/api/records/export?taxYear=2026-27&fromDate=2026-04-06'),
    );

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('updates and reads only the authenticated user record', async () => {
    const postResponse = await databasePost(createPostRequest('http://localhost/api/db', {
      nino: 'AB123456C', sub: 'attacker-subject'
    }));
    expect(postResponse.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE public.users'), ['AB123456C', '123']);

    queryMock.mockResolvedValueOnce({ rows: [{ ni_number: 'AB123456C' }] });
    const getResponse = await databaseGet();
    expect(await getResponse.json()).toEqual({ ni_number: 'AB123456C' });
    expect(pool.query).toHaveBeenLastCalledWith('SELECT ni_number FROM public.users WHERE id = $1', ['123']);
  });

  it('returns a database error when saving the user record fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('database unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await databasePost(createPostRequest('http://localhost/api/db', {
      nino: 'AB123456C', sub: 'auth0|user-123'
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Unable to update account details' });
    consoleError.mockRestore();
  });

  it('persists cookie preferences to the cookie store and database', async () => {
    const postResponse = await cookiesPost(createPostRequest('http://localhost/api/cookies', {
      selected: ['essential', 'analytics']
    }));

    expect(postResponse.status).toBe(200);
    expect(cookieStore.set).toHaveBeenCalledWith('allow_cookies', '["essential","analytics"]', expect.objectContaining({
      httpOnly: true,
      secure: false
    }));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE public.users'), ['["essential","analytics"]', '123']);
  });

  it('loads cookie preferences from the database', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ allow_cookies: '["essential"]' }] });

    const response = await cookiesGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 200, allowCookies: '["essential"]' });
    expect(cookieStore.set).toHaveBeenCalledWith('allow_cookies', '["essential"]', expect.objectContaining({ secure: false }));
  });
});