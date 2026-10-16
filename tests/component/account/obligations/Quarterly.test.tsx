// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
});