// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  disallowableExpenseFields,
  expenseFields,
  incomeFields,
} from '@/app/components/ui/account/context/CalculatorState';
import { incomeTransferStorageKey } from '@/app/components/ui/account/incomeTransfer';
import QuarterlyUpdates from '@/app/components/ui/account/updates/QuarterlyUpdates';

const { routerReplace } = vi.hoisted(() => ({ routerReplace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

function amountValues(fields: readonly { name: string }[], value: string) {
  return Object.fromEntries(fields.map(({ name }) => [name, value]));
}

describe('QuarterlyUpdates income transfer', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/account/quarterly?incomeTransfer=1');
    vi.clearAllMocks();
  });

  it('opens the itemised form with transferred income, expenses, and disallowable values', async () => {
    window.sessionStorage.setItem(incomeTransferStorageKey, JSON.stringify({
      mode: 'itemised',
      income: { ...amountValues(incomeFields, '0.00'), turnover: '1250.50' },
      consolidatedExpenses: '0.00',
      consolidatedDisallowableExpenses: '0.00',
      expenses: { ...amountValues(expenseFields, '0.00'), costOfGoods: '300.25' },
      disallowableExpenses: { ...amountValues(disallowableExpenseFields, '0.00'), costOfGoodsDisallowable: '45.10' },
    }));
    window.history.replaceState({}, '', '/account/quarterly?nino=AB123456C&businessId=XBIS123&startDate=2025-04-06&endDate=2025-07-05&incomeTransfer=1');

    render(
      <StrictMode>
        <QuarterlyUpdates
          nino="AB123456C"
          businessId="XBIS123"
          startDate="2025-04-06"
          endDate="2025-07-05"
          incomeTransfer
        />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByRole('radio', { name: 'Itemised expenses' })).toBeChecked());
    expect(screen.getByLabelText(/Turnover/)).toHaveValue(1250.5);
    expect(document.getElementById('amount-cost-of-goods')).toHaveValue(300.25);
    expect(document.getElementById('amount-cost-of-goods-not-allowable')).toHaveValue(45.1);
    expect(screen.getByText('Disallowable expenses').closest('details')).toHaveProperty('open', true);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(
      '/account/quarterly?nino=AB123456C&businessId=XBIS123&startDate=2025-04-06&endDate=2025-07-05',
    ));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(incomeTransferStorageKey)).toBeNull();
  });

  it('prefills the consolidated form when calculators were not used', async () => {
    window.sessionStorage.setItem(incomeTransferStorageKey, JSON.stringify({
      mode: 'consolidated',
      income: { ...amountValues(incomeFields, '0.00'), turnover: '900.00' },
      consolidatedExpenses: '125.50',
      consolidatedDisallowableExpenses: '12.25',
      expenses: amountValues(expenseFields, '0.00'),
      disallowableExpenses: amountValues(disallowableExpenseFields, '0.00'),
    }));

    render(<QuarterlyUpdates incomeTransfer />);

    await waitFor(() => expect(screen.getByRole('radio', { name: 'Consolidated expenses' })).toBeChecked());
    expect(screen.getByLabelText(/Turnover/)).toHaveValue(900);
    expect(screen.getByLabelText(/Total expenses/)).toHaveValue(125.5);
    expect(screen.getByLabelText(/Total disallowable expenses/)).toHaveValue(12.25);
    expect(screen.getByRole('button', { name: 'Submit Update To HMRC' })).toBeDisabled();
  });
});
