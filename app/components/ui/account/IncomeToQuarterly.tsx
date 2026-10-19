'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  disallowableExpenseFields,
  expenseFields,
  incomeFields,
  useCalculatorState,
  type AmountRow,
} from './context/CalculatorState';
import {
  incomeTransferStorageKey,
  type QuarterlyIncomeTransfer,
} from './incomeTransfer';

function rowValues<Field extends string>(
  fields: readonly { name: Field }[],
  rows: AmountRow[],
): Record<Field, string> {
  return Object.fromEntries(
    fields.map(({ name }) => [name, rows.find((row) => row.field === name)?.value ?? '0.00']),
  ) as Record<Field, string>;
}

function hasAmount(value: string) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export default function IncomeToQuarterly() {
  const router = useRouter();
  const {
    income,
    expense,
    disallowableExpense,
    incomeTotal,
    expenseTotal,
    disallowableExpenseTotal,
    showCalculators,
    calculatorUsed,
  } = useCalculatorState();
  const [error, setError] = useState<string>();
  const hasEnteredValues = [
    incomeTotal,
    expenseTotal,
    disallowableExpenseTotal,
    ...income.map((row) => row.value),
    ...expense.map((row) => row.value),
    ...disallowableExpense.map((row) => row.value),
  ].some(hasAmount);

  function transferToQuarterly() {
    const useItemisedValues = showCalculators && calculatorUsed;
    const transfer: QuarterlyIncomeTransfer = {
      mode: useItemisedValues ? 'itemised' : 'consolidated',
      income: useItemisedValues
        ? rowValues(incomeFields, income)
        : { turnover: incomeTotal, other: '0.00', taxTakenOffTradingIncome: '0.00' },
      consolidatedExpenses: expenseTotal,
      consolidatedDisallowableExpenses: disallowableExpenseTotal,
      expenses: rowValues(expenseFields, expense),
      disallowableExpenses: rowValues(disallowableExpenseFields, disallowableExpense),
    };

    try {
      window.sessionStorage.setItem(incomeTransferStorageKey, JSON.stringify(transfer));
    } catch {
      setError('Your figures could not be prepared for transfer. Please check your browser storage settings and try again.');
      return;
    }

    const query = new URLSearchParams(window.location.search);
    query.set('incomeTransfer', '1');
    setError(undefined);
    router.push(`/account/quarterly?${query.toString()}`);
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={transferToQuarterly}
        disabled={!hasEnteredValues}
        className="w-fit rounded-xl border-2 border-blue-600 bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
      >
        Use figures in quarterly update
      </button>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
