// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
});