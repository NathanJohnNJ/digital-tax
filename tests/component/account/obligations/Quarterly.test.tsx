// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import Quarterly from '../../../../app/components/ui/account/obligations/Quarterly';

vi.mock('@/client/fraud/clientData', () => ({
  buildClientPayload: vi.fn().mockResolvedValue({ connectionMethod: 'WEB_APP_VIA_SERVER' })
}));

const obligationsResponse = {
  obligations: [
    {
      typeOfBusiness: 'self-employment',
      businessId: 'XBIS123',
      obligationDetails: [
        {
          periodStartDate: '2018-04-06',
          periodEndDate: '2018-07-05',
          dueDate: '2018-08-05',
          receivedDate: '2018-08-01',
          status: 'fulfilled'
        },
        {
          periodStartDate: '2018-07-06',
          periodEndDate: '2018-10-05',
          dueDate: '2018-11-05',
          status: 'open'
        }
      ]
    }
  ]
};

describe('Quarterly', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => obligationsResponse
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders each obligation with formatted dates and the correct state', async () => {
    render(<Quarterly businessId="XBIS123" nino="AB123456C" year="2018-19" />);

    expect(await screen.findByText('Fulfilled on 1st August 2018')).toBeInTheDocument();
    expect(screen.getByText('6th July 2018 to 5th October 2018')).toBeInTheDocument();
    expect(screen.getByText('Due 5th November 2018')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go To Quarterly updates' })).toBeInTheDocument();
  });

  it('links open obligations to their period and selected business', async () => {
    render(<Quarterly businessId="XBIS123" nino="AB123456C" year="2018-19" />);

    const quarterlyLink = await screen.findByRole('link', { name: 'Go To Quarterly updates' });
    const linkUrl = new URL(quarterlyLink.getAttribute('href')!, 'http://localhost');

    expect(linkUrl.pathname).toBe('/account/quarterly');
    expect(linkUrl.searchParams.get('nino')).toBe('AB123456C');
    expect(linkUrl.searchParams.get('businessId')).toBe('XBIS123');
    expect(linkUrl.searchParams.get('startDate')).toBe('2018-07-06');
    expect(linkUrl.searchParams.get('endDate')).toBe('2018-10-05');
  });

  it('keeps the selected year when an older request finishes later', async () => {
    let resolveOld!: (value: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { resolveOld = resolve; });
    const newerResponse = {
      obligations: [{
        typeOfBusiness: 'self-employment',
        businessId: 'XBIS123',
        obligationDetails: [{
          periodStartDate: '2025-04-06',
          periodEndDate: '2025-07-05',
          dueDate: '2025-08-05',
          status: 'open',
        }],
      }],
    };
    vi.mocked(fetch)
      .mockReturnValueOnce(oldRequest)
      .mockResolvedValueOnce(Response.json(newerResponse));

    const { rerender } = render(<Quarterly businessId="XBIS123" nino="AB123456C" year="2018-19" />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    rerender(<Quarterly businessId="XBIS123" nino="AB123456C" year="2025-26" />);
    const link = await screen.findByRole('link', { name: 'Go To Quarterly updates' });
    expect(new URL(link.getAttribute('href')!, 'http://localhost').searchParams.get('startDate')).toBe('2025-04-06');
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body)).taxYear).toBe('2025-26');

    await act(async () => { resolveOld(Response.json(obligationsResponse)); });
    expect(screen.getByText('6th April 2025 to 5th July 2025')).toBeInTheDocument();
    expect(screen.queryByText('6th July 2018 to 5th October 2018')).not.toBeInTheDocument();
  });

  it('shows an error when the obligations request fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    render(<Quarterly businessId="XBIS123" nino="AB123456C" year="2025-26" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load quarterly obligations');
  });
});