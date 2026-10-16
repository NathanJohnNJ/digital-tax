// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import BusinessDetails from '../../../app/components/ui/account/BusinessDetails';

vi.mock('@/client/fraud/clientData', () => ({
  buildClientPayload: vi.fn().mockResolvedValue({ connectionMethod: 'WEB_APP_VIA_SERVER' })
}));

const businessDetails = {
  businessId: 'XBIS123',
  typeOfBusiness: 'self-employment',
  tradingType: 'self-employed',
  tradingName: 'Example Design',
  accountingPeriods: [{ start: '2018-04-06', end: '2019-04-05' }],
  commencementDate: '2018-04-06',
  businessAddressLineOne: '1 Example Street',
  businessAddressPostcode: 'AB1 2CD'
};

describe('BusinessDetails', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders business details returned by the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(businessDetails)
    }));

    render(<BusinessDetails businessId="XBIS123" nino="AB123456C" />);

    expect(await screen.findByRole('heading', { name: 'Business Details' })).toBeInTheDocument();
    expect(screen.getByText('Example Design')).toBeInTheDocument();
    expect(screen.getByText('1 Example Street')).toBeInTheDocument();
  });

  it('shows HMRC error messages and validation details instead of a no-details message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        code: 'FORMAT_FIELD_INVALID',
        message: 'The request could not be processed.',
        errors: [{ code: 'INVALID_BUSINESS_ID', message: 'The business ID is not valid.' }]
      })
    }));

    render(<BusinessDetails businessId="XBIS123" nino="AB123456C" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The request could not be processed.');
    expect(screen.getByRole('alert')).toHaveTextContent('The business ID is not valid.');
    expect(screen.queryByText(/No business details found/)).not.toBeInTheDocument();
  });

  it('shows an actionable message when HMRC cannot find a business and gives no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => ''
    }));

    render(<BusinessDetails businessId="XBIS123" nino="AB123456C" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('HMRC could not find details for this business.');
  });

  it('refetches when the selected business identifiers change', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      return {
        ok: true,
        text: async () => JSON.stringify({
          ...businessDetails,
          businessId: body.businessID,
          tradingName: `Trading ${body.businessID}`
        })
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<BusinessDetails businessId="XBIS123" nino="AB123456C" />);
    expect(await screen.findByText('Trading XBIS123')).toBeInTheDocument();

    rerender(<BusinessDetails businessId="XBIS456" nino="AB123456C" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Trading XBIS456')).toBeInTheDocument();
  });
});