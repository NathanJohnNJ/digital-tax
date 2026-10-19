// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Calculator from '@/app/components/ui/account/Calculator';
import { CalculatorStateProvider } from '@/app/components/ui/account/context/CalculatorState';
import IncomeExpense from '@/app/components/ui/account/IncomeExpense';
import IncomeToQuarterly from '@/app/components/ui/account/IncomeToQuarterly';
import { incomeTransferStorageKey, parseQuarterlyIncomeTransfer } from '@/app/components/ui/account/incomeTransfer';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

function IncomePageHarness() {
  return (
    <CalculatorStateProvider>
      <IncomeExpense />
      <Calculator />
      <IncomeToQuarterly />
    </CalculatorStateProvider>
  );
}

describe('IncomeToQuarterly', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
  });

  it('is disabled until an amount has been entered', () => {
    render(<IncomePageHarness />);

    expect(screen.getByRole('button', { name: 'Use figures in quarterly update' })).toBeDisabled();
  });

  it('transfers the direct totals in consolidated mode and preserves the selected update context', () => {
    window.history.replaceState({}, '', '/account/income?nino=AB123456C&businessId=XBIS123&startDate=2025-04-06&endDate=2025-07-05');
    render(<IncomePageHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Calculators' }));
    fireEvent.change(screen.getByLabelText('Total Income'), { target: { value: '1500.25' } });
    fireEvent.change(screen.getByLabelText('Total Expenditure'), { target: { value: '400.50' } });
    fireEvent.change(screen.getByLabelText('Total Disallowable Expenditure'), { target: { value: '25.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use figures in quarterly update' }));

    const transfer = parseQuarterlyIncomeTransfer(window.sessionStorage.getItem(incomeTransferStorageKey) ?? '');
    expect(transfer).toMatchObject({
      mode: 'consolidated',
      income: { turnover: '1500.25' },
      consolidatedExpenses: '400.50',
      consolidatedDisallowableExpenses: '25.25',
    });
    const destination = new URL(routerPush.mock.calls[0][0], window.location.origin);
    expect(destination.pathname).toBe('/account/quarterly');
    expect(destination.searchParams.get('businessId')).toBe('XBIS123');
    expect(destination.searchParams.get('startDate')).toBe('2025-04-06');
    expect(destination.searchParams.get('incomeTransfer')).toBe('1');
  });

  it('transfers all calculator categories as itemised amounts when visible and edited', () => {
    render(<IncomePageHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Calculators' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show income fields' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show expenses fields' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show disallowable expenses fields' }));
    fireEvent.change(screen.getByLabelText('Turnover'), { target: { value: '2200.75' } });
    fireEvent.change(screen.getByLabelText('Cost of goods'), { target: { value: '300.50' } });
    fireEvent.change(screen.getByLabelText('Cost of goods disallowable'), { target: { value: '50.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use figures in quarterly update' }));

    const transfer = parseQuarterlyIncomeTransfer(window.sessionStorage.getItem(incomeTransferStorageKey) ?? '');
    expect(transfer).toMatchObject({
      mode: 'itemised',
      income: { turnover: '2200.75' },
      expenses: { costOfGoods: '300.50' },
      disallowableExpenses: { costOfGoodsDisallowable: '50.25' },
    });
    expect(Object.keys(transfer?.expenses ?? {})).toHaveLength(15);
    expect(Object.keys(transfer?.disallowableExpenses ?? {})).toHaveLength(15);
  });
});
