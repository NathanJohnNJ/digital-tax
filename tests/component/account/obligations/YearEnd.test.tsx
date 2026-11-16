// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import YearEnd from '../../../../app/components/ui/account/obligations/YearEnd';

vi.mock('@/client/fraud/clientData', () => ({
  buildClientPayload: vi.fn().mockResolvedValue({ connectionMethod: 'WEB_APP_VIA_SERVER' })
}));

describe('YearEnd', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        obligations: [{
          periodStartDate: '2018-04-06',
          periodEndDate: '2019-04-05',
          dueDate: '2019-10-31',
          status: 'open'
        }]
      })
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('links an open year-end obligation with business and period details', async () => {
    render(<YearEnd businessId="XBIS123" nino="AB123456C" year="2018-19" />);

    const link = await screen.findByRole('link', { name: 'Go To Year End Tax Return' });
    const linkUrl = new URL(link.getAttribute('href')!, 'http://localhost');

    expect(linkUrl.pathname).toBe('/account/taxReturn');
    expect(linkUrl.searchParams.get('nino')).toBe('AB123456C');
    expect(linkUrl.searchParams.get('businessId')).toBe('XBIS123');
    expect(linkUrl.searchParams.get('startDate')).toBe('2018-04-06');
    expect(linkUrl.searchParams.get('endDate')).toBe('2019-04-05');
  });

  it('ignores a previous year response that arrives after the selected year', async () => {
    let resolveOld!: (value: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { resolveOld = resolve; });
    const newerResponse = { obligations: [{
      periodStartDate: '2025-04-06',
      periodEndDate: '2026-04-05',
      dueDate: '2027-01-31',
      status: 'open',
    }] };
    const olderResponse = { obligations: [{
      periodStartDate: '2018-04-06',
      periodEndDate: '2019-04-05',
      dueDate: '2020-01-31',
      status: 'open',
    }] };
    vi.mocked(fetch)
      .mockReturnValueOnce(oldRequest)
      .mockResolvedValueOnce(Response.json(newerResponse));

    const { rerender } = render(<YearEnd businessId="XBIS123" nino="AB123456C" year="2018-19" />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    rerender(<YearEnd businessId="XBIS123" nino="AB123456C" year="2025-26" />);
    const link = await screen.findByRole('link', { name: 'Go To Year End Tax Return' });
    expect(new URL(link.getAttribute('href')!, 'http://localhost').searchParams.get('endDate')).toBe('2026-04-05');
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body)).taxYear).toBe('2025-26');

    await act(async () => { resolveOld(Response.json(olderResponse)); });
    expect(screen.getByText('6th April 2025 to 5th April 2026')).toBeInTheDocument();
    expect(screen.queryByText('6th April 2018 to 5th April 2019')).not.toBeInTheDocument();
  });

  it('shows an error when the obligations request fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    render(<YearEnd businessId="XBIS123" nino="AB123456C" year="2025-26" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load year-end obligations');
  });
});