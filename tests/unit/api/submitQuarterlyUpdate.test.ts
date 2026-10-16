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
vi.mock('@/app/actions/requestUserAccessToken', () => ({
  requestUserAccessToken: vi.fn(),
}));
vi.mock('@/app/api/utils/buildFraudPreventionHeaders', () => ({
  buildFraudPreventionHeaders: vi.fn().mockResolvedValue({
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
  }),
}));

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/hmrc/userRestrictedAuth/submitQuarterlyUpdate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function submission(taxYear: string, periodIncome: Record<string, number>) {
  return {
    clientData: {},
    nino: 'AA123456A',
    businessId: 'XAIS12345678910',
    taxYear,
    periodStartDate: `${taxYear.slice(0, 4)}-04-06`,
    periodEndDate: `${Number(taxYear.slice(0, 4)) + 1}-04-05`,
    periodIncome,
    periodExpenses: { consolidatedExpenses: 0 },
  };
}

describe('quarterly update income schema by tax year', () => {
  let post: typeof import('@/app/api/hmrc/userRestrictedAuth/submitQuarterlyUpdate/route').POST;

  beforeEach(async () => {
    vi.resetModules();
    cookieStore.has.mockReturnValue(true);
    cookieStore.get.mockReturnValue({ value: 'sandbox-access-token' });
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ periodId: '2022-04-06_2023-04-05' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));
    ({ POST: post } = await import('@/app/api/hmrc/userRestrictedAuth/submitQuarterlyUpdate/route'));
  });

  it('accepts and submits only turnover and other for tax year 2022-23', async () => {
    const response = await post(postRequest(submission('2022-23', {
      turnover: 1200,
      other: 50,
    })));

    expect(response.status).toBe(200);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).periodIncome).toEqual({
      turnover: 1200,
      other: 50,
    });
  });

  it('requires and submits taxTakenOffTradingIncome from tax year 2023-24', async () => {
    const response = await post(postRequest(submission('2023-24', {
      turnover: 1200,
      other: 50,
      taxTakenOffTradingIncome: 25,
    })));

    expect(response.status).toBe(200);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).periodIncome).toEqual({
      turnover: 1200,
      other: 50,
      taxTakenOffTradingIncome: 25,
    });
  });

  it('rejects a missing taxTakenOffTradingIncome value from tax year 2023-24', async () => {
    const response = await post(postRequest(submission('2023-24', {
      turnover: 1200,
      other: 50,
    })));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects the unsupported tax field for tax year 2022-23 before calling HMRC', async () => {
    const response = await post(postRequest(submission('2022-23', {
      turnover: 1200,
      other: 50,
      taxTakenOffTradingIncome: 25,
    })));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
