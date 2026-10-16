import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/app/actions/requestUserAccessToken', () => ({
  requestUserAccessToken: vi.fn(),
}));
vi.mock('@/app/api/utils/buildFraudPreventionHeaders', () => ({
  buildFraudPreventionHeaders: vi.fn().mockResolvedValue({
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
  }),
}));

const periodId = '2024-04-06_2024-07-05';
const period = {
  periodDates: { periodStartDate: '2024-04-06', periodEndDate: '2024-07-05' },
  periodIncome: { turnover: 1200, other: 50, taxTakenOffTradingIncome: 0 },
  periodExpenses: { consolidatedExpenses: 100 },
};

function postRequest(taxYear = '2024-25') {
  return new NextRequest('http://localhost/api/hmrc/userRestrictedAuth/quarterlyUpdateHistory', {
    method: 'POST',
    body: JSON.stringify({
      clientData: {},
      nino: 'AA123456A',
      businessId: 'XAIS12345678910',
      taxYear,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

function hmrcResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function summaryResponse() {
  return hmrcResponse({ periods: [{ periodId }] });
}

function noObligationsResponse() {
  return hmrcResponse({
    code: 'NO_OBLIGATIONS_FOUND',
    message: 'No obligations found using this filter',
  }, 404);
}

describe('quarterly update history upstream outcomes', () => {
  let post: typeof import('@/app/api/hmrc/userRestrictedAuth/quarterlyUpdateHistory/route').POST;

  beforeEach(async () => {
    vi.resetModules();
    cookieStore.get.mockReturnValue({ value: 'sandbox-access-token' });
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.stubGlobal('fetch', vi.fn());
    ({ POST: post } = await import('@/app/api/hmrc/userRestrictedAuth/quarterlyUpdateHistory/route'));
  });

  it('returns no updates for the documented summary no-data response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      code: 'MATCHING_RESOURCE_NOT_FOUND',
      message: 'Matching resource not found',
    }, 404));

    const response = await post(postRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updates: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves an unexpected summary error status and body', async () => {
    const errorBody = { code: 'SERVICE_UNAVAILABLE', message: 'Try again later' };
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(errorBody, 503));

    const response = await post(postRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: errorBody.message,
      status: 503,
      details: errorBody,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns an empty obligations list for the documented no-obligations response', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(summaryResponse())
      .mockResolvedValueOnce(noObligationsResponse())
      .mockResolvedValueOnce(hmrcResponse(period));

    const response = await post(postRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      updates: [{ ...period, receivedDate: undefined }],
    });
  });

  it('preserves an unexpected obligations error status and body', async () => {
    const errorBody = { code: 'SERVICE_UNAVAILABLE', message: 'Try again later' };
    vi.mocked(fetch)
      .mockResolvedValueOnce(summaryResponse())
      .mockResolvedValueOnce(hmrcResponse(errorBody, 503));

    const response = await post(postRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: errorBody.message,
      status: 503,
      details: errorBody,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not treat a missing obligations business as no obligations', async () => {
    const errorBody = { code: 'MATCHING_RESOURCE_NOT_FOUND', message: 'Matching resource not found' };
    vi.mocked(fetch)
      .mockResolvedValueOnce(summaryResponse())
      .mockResolvedValueOnce(hmrcResponse(errorBody, 404));

    const response = await post(postRequest());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: errorBody.message,
      status: 404,
      details: errorBody,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves period-detail errors instead of returning summary-only data', async () => {
    const errorBody = { code: 'SERVICE_UNAVAILABLE', message: 'Try again later' };
    vi.mocked(fetch)
      .mockResolvedValueOnce(summaryResponse())
      .mockResolvedValueOnce(noObligationsResponse())
      .mockResolvedValueOnce(hmrcResponse(errorBody, 503));

    const response = await post(postRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: errorBody.message,
      status: 503,
      details: errorBody,
    });
  });

  it('omits period details for the documented no-data response, not partial summary data', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(summaryResponse())
      .mockResolvedValueOnce(noObligationsResponse())
      .mockResolvedValueOnce(hmrcResponse({
        code: 'MATCHING_RESOURCE_NOT_FOUND',
        message: 'Matching resource not found',
      }, 404));

    const response = await post(postRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updates: [] });
  });
});
