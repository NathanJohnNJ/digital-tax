// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SelfAssessmentTaxCalculations from '@/app/components/ui/account/SelfAssessmentTaxCalculations';

vi.mock('@/client/fraud/clientData', () => ({
  buildClientPayload: vi.fn().mockResolvedValue({ connectionMethod: 'WEB_APP_VIA_SERVER' }),
}));

function apiResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

describe('SelfAssessmentTaxCalculations', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows calculation results as collapsed sections and formats monetary values', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({
        calculations: [{ calculationId: 'calc-1', calculationType: 'P800', calculationTimestamp: '2026-10-01T12:00:00Z' }],
      }))
      .mockResolvedValueOnce(apiResponse({
        calculation: {
          taxCalculation: {
            incomeTax: {
              payPensionsProfit: {
                taxBands: [{ income: 1234.56 }],
                taxRate: 0.2,
              },
            },
          },
        },
        metadata: {
          calculationId: 'calc-1',
          taxYear: '2025-26',
        },
      }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SelfAssessmentTaxCalculations nino="AB123456C" businessId="XAIS12345678910" taxYear="2025-26" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Tax Calculations' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retrieve Calculation' }));

    const calculationTable = await screen.findByRole('table', { name: 'Details for calculation calc-1' });
    const tableContent = within(calculationTable);
    expect(tableContent.getByRole('button', { name: 'Tax Calculations' })).toHaveAttribute('aria-expanded', 'false');
    expect(tableContent.queryByRole('button', { name: 'Income Tax' })).not.toBeInTheDocument();
    expect(tableContent.getByRole('button', { name: 'Metadata' })).toHaveAttribute('aria-expanded', 'false');
    expect(tableContent.queryByText('Income')?.closest('tr')).toHaveStyle({ visibility: 'collapse' });
    expect(calculationTable).toHaveClass('w-max', 'min-w-max', 'md:w-full', 'md:min-w-0', 'md:table-fixed');
    expect(tableContent.getByRole('columnheader', { name: 'Field' })).toHaveClass('md:whitespace-normal');

    fireEvent.click(tableContent.getByRole('button', { name: 'Tax Calculations' }));
    expect(tableContent.getByRole('button', { name: 'Tax Calculations' }).querySelector('svg')).toHaveClass('rotate-180');
    fireEvent.click(tableContent.getByRole('button', { name: 'Tax Calculations' }));
    expect(tableContent.getByRole('button', { name: 'Tax Calculations' }).querySelector('svg')).not.toHaveClass('rotate-180');
    expect(tableContent.queryByRole('button', { name: 'Income Tax' })).not.toBeInTheDocument();

    fireEvent.click(tableContent.getByRole('button', { name: 'Tax Calculations' }));
    fireEvent.click(tableContent.getByRole('button', { name: 'Income Tax' }));
    fireEvent.click(tableContent.getByRole('button', { name: 'Pay Pensions Profit' }));
    fireEvent.click(tableContent.getByRole('button', { name: 'Tax Bands' }));

    expect(tableContent.getByRole('row', { name: 'Income £1,234.56' })).toBeInTheDocument();
    expect(tableContent.getByRole('row', { name: 'Tax Rate 0.2' })).toBeInTheDocument();
    fireEvent.click(tableContent.getByRole('button', { name: 'Metadata' }));
    expect(tableContent.getByRole('row', { name: 'Calculation Id calc-1' })).toBeInTheDocument();
    expect(tableContent.getByRole('row', { name: 'Tax Year 2025-26' })).toBeInTheDocument();
    expect(tableContent.queryByText(/calculation\.taxCalculation/)).not.toBeInTheDocument();
    expect(tableContent.getByRole('row', { name: 'Income £1,234.56' }).querySelector('th')).toHaveClass('whitespace-nowrap');
    expect(tableContent.getByRole('row', { name: 'Income £1,234.56' }).querySelector('td')).toHaveClass('text-right');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
