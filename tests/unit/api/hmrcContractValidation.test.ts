import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as businessListPost } from '../../../app/api/hmrc/userRestrictedAuth/businessList/route';
import { POST as businessDetailsPost } from '../../../app/api/hmrc/userRestrictedAuth/businessDetails/route';
import { POST as quarterlyObligationsPost } from '../../../app/api/hmrc/userRestrictedAuth/obligations/quarterly/route';
import { POST as yearEndObligationsPost } from '../../../app/api/hmrc/userRestrictedAuth/obligations/yearEnd/route';
import { POST as calculationListPost } from '../../../app/api/hmrc/userRestrictedAuth/listSelfAssessmentTaxCalculations/route';
import { POST as calculationRetrievePost } from '../../../app/api/hmrc/userRestrictedAuth/retrieveSelfAssessmentTaxCalculation/route';
import { POST as calculationTriggerPost } from '../../../app/api/hmrc/userRestrictedAuth/individualTaxCalculation/route';
import { buildFraudPreventionHeaders } from '../../../app/api/utils/buildFraudPreventionHeaders';

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    has: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('../../../app/actions/requestUserAccessToken', () => ({ requestUserAccessToken: vi.fn() }));
vi.mock('../../../app/api/utils/buildFraudPreventionHeaders', () => ({
  buildFraudPreventionHeaders: vi.fn().mockResolvedValue({
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
  }),
}));

const nino = 'AB123456C';
const businessId = 'XBIS12345678901';
const calculationId = 'f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c';

function postRequest(body: unknown, path = 'business') {
  return new NextRequest(`http://localhost/api/hmrc/${path}`, {
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

function body(overrides: Record<string, unknown> = {}) {
  return { clientData: {}, nino, ...overrides };
}

describe('business, obligation, and calculation route contract validation', () => {
  beforeEach(() => {
    cookieStore.has.mockReturnValue(true);
    cookieStore.get.mockReturnValue({ value: 'test-access-token' });
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects malformed JSON and invalid identifiers before contacting HMRC', async () => {
    const malformedJson = new NextRequest('http://localhost/api/business-details', {
      method: 'POST',
      body: '{',
      headers: { 'Content-Type': 'application/json' },
    });
    const badJsonResponse = await businessDetailsPost(malformedJson);
    expect(badJsonResponse.status).toBe(400);

    const badInputResponse = await quarterlyObligationsPost(postRequest(body({
      businessId: 'not-a-business-id',
      taxYear: '2025-27',
    })));
    expect(badInputResponse.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates business list and details responses against required HMRC fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      listOfBusinesses: [{
        businessId,
        typeOfBusiness: 'self-employment',
        tradingName: 'Example business',
      }],
    }));
    const listResponse = await businessListPost(postRequest(body()));
    expect(listResponse.status).toBe(200);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      businessId,
      typeOfBusiness: 'self-employment',
      accountingPeriods: [{ start: '2025-04-06', end: '2026-04-05' }],
    }));
    const detailsResponse = await businessDetailsPost(postRequest(body({ businessID: businessId })));
    expect(detailsResponse.status).toBe(200);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({ listOfBusinesses: [{ businessId }] }));
    const invalidResponse = await businessListPost(postRequest(body()));
    expect(invalidResponse.status).toBe(502);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      businessId: 'XBIS00000000000',
      typeOfBusiness: 'self-employment',
    }));
    const mismatchedDetailsResponse = await businessDetailsPost(postRequest(body({ businessID: businessId })));
    expect(mismatchedDetailsResponse.status).toBe(502);
  });

  it('rejects malformed quarterly and year-end obligation success payloads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      obligations: [{
        typeOfBusiness: 'self-employment',
        businessId,
        obligationDetails: [{
          periodStartDate: '2025-02-30',
          periodEndDate: '2025-07-05',
          dueDate: '2025-08-05',
          status: 'open',
        }],
      }],
    }));
    const quarterlyResponse = await quarterlyObligationsPost(postRequest(body({
      businessId,
      taxYear: '2025-26',
    })));
    expect(quarterlyResponse.status).toBe(502);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      obligations: [{
        periodStartDate: '2025-04-06',
        periodEndDate: '2026-04-05',
        dueDate: '2026-01-31',
        status: 'pending',
      }],
    }));
    const yearEndResponse = await yearEndObligationsPost(postRequest(body({ taxYear: '2025-26' })));
    expect(yearEndResponse.status).toBe(502);
  });

  it('validates calculation-list, retrieval, and trigger response shapes and statuses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      calculations: [{
        calculationId,
        calculationType: 'intent-to-finalise',
        calculationTimestamp: '2026-10-01T12:00:00.000Z',
        calculationTrigger: 'attended',
        calculationOutcome: 'PROCESSED',
      }],
    }));
    const listResponse = await calculationListPost(postRequest(body({ taxYear: '2025-26' })));
    expect(listResponse.status).toBe(200);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      calculations: [{
        calculationId,
        calculationType: 'final-declaration',
        calculationTimestamp: '2023-01-31T12:00:00.000Z',
      }],
    }));
    const historicalListResponse = await calculationListPost(postRequest(body({ taxYear: '2022-23' })));
    expect(historicalListResponse.status).toBe(200);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      calculations: [{
        calculationId,
        calculationType: 'intent-to-finalise',
        calculationTimestamp: '2026-10-01T12:00:00.000Z',
      }],
    }));
    const incompleteListResponse = await calculationListPost(postRequest(body({ taxYear: '2025-26' })));
    expect(incompleteListResponse.status).toBe(502);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      metadata: { calculationId, taxYear: '2025-26' },
      inputs: {},
    }));
    const retrievalResponse = await calculationRetrievePost(postRequest(body({
      calculationId,
      taxYear: '2025-26',
    })));
    expect(retrievalResponse.status).toBe(200);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      metadata: { calculationId, taxYear: '2024-25' },
      inputs: {},
    }));
    const mismatchedRetrievalResponse = await calculationRetrievePost(postRequest(body({
      calculationId,
      taxYear: '2025-26',
    })));
    expect(mismatchedRetrievalResponse.status).toBe(502);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({ calculationId }, 200));
    const incorrectTriggerStatus = await calculationTriggerPost(postRequest(body({
      calculationType: 'in-year',
      taxYear: '2025-26',
    })));
    expect(incorrectTriggerStatus.status).toBe(502);

    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({ calculationId }, 202));
    const triggerResponse = await calculationTriggerPost(postRequest(body({
      calculationType: 'in-year',
      taxYear: '2025-26',
    })));
    expect(triggerResponse.status).toBe(202);
    expect(await triggerResponse.json()).toEqual({ calculationId });
  });

  it('preserves HMRC error status and sanitized useful details', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(hmrcResponse({
      code: 'INVALID_REQUEST',
      message: `Unable to process NINO ${nino}; Authorization: Bearer private-token`,
      errors: [{ code: 'FORMAT_NINO', message: `Invalid value ${nino}` }],
    }, 400));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await businessListPost(postRequest(body()));
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).not.toContain(nino);
    expect(responseBody.error).not.toContain('private-token');
    expect(responseBody.details).toEqual({
      code: 'INVALID_REQUEST',
      message: responseBody.error,
      errors: [{ code: 'FORMAT_NINO', message: 'Invalid value [redacted]' }],
    });
    expect(consoleError).toHaveBeenCalledWith('HMRC business list request failed', {
      status: 400,
      correlationId: undefined,
      code: 'INVALID_REQUEST',
    });
    expect(buildFraudPreventionHeaders).toHaveBeenCalled();
  });
});
