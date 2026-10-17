import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    has: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('../../../app/actions/requestUserAccessToken', () => ({
  requestUserAccessToken: vi.fn(),
}));
vi.mock('../../../app/api/utils/buildFraudPreventionHeaders', () => ({
  buildFraudPreventionHeaders: vi.fn().mockResolvedValue({
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
  }),
}));

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/hmrc/userRestrictedAuth/listSelfAssessmentTaxCalculations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function hmrcResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('self-assessment calculation-list HMRC request', () => {
  let post: typeof import('@/app/api/hmrc/userRestrictedAuth/listSelfAssessmentTaxCalculations/route').POST;

  beforeEach(async () => {
    vi.resetModules();
    cookieStore.has.mockReturnValue(true);
    cookieStore.get.mockReturnValue({ value: 'sandbox-access-token' });
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.stubGlobal('fetch', vi.fn());
    ({ POST: post } = await import('../../../app/api/hmrc/userRestrictedAuth/listSelfAssessmentTaxCalculations/route'));
  });

  it('uses the current Sandbox v9 list path, Accept version, and only documented query parameters', async () => {
    const body = {
      calculations: [
        {
          calculationId: 'f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c',
          calculationType: 'intent-to-finalise',
          calculationTimestamp: '2026-10-01T12:00:00.000Z',
          calculationTrigger: 'attended',
          calculationOutcome: 'PROCESSED',
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(body));

    const response = await post(postRequest({
      clientData: {},
      nino: 'AA123456A',
      taxYear: '2025-26',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);

    const [requestUrl, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect(String(requestUrl)).toBe(
      'https://test-api.service.hmrc.gov.uk/individuals/calculations/AA123456A/self-assessment/2025-26',
    );
    expect(new URL(String(requestUrl)).search).toBe('');
    expect(requestInit?.method).toBe('GET');
    expect(new Headers(requestInit?.headers).get('Accept')).toBe('application/vnd.hmrc.9.0+json');
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe('Bearer sandbox-access-token');
  });

  it('preserves HMRC error status and message from the list endpoint', async () => {
    const errorBody = { code: 'MATCHING_RESOURCE_NOT_FOUND', message: 'Matching resource not found' };
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse(errorBody, 404));

    const response = await post(postRequest({
      clientData: {},
      nino: 'AA123456A',
      taxYear: '2025-26',
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: errorBody.message,
      status: 404,
      details: errorBody,
    });
  });
});
