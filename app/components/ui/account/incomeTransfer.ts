import {
  disallowableExpenseFields,
  expenseFields,
  incomeFields,
} from './context/CalculatorState';

export const incomeTransferStorageKey = 'quarterly-income-transfer';

type IncomeField = typeof incomeFields[number]['name'];
type ExpenseField = typeof expenseFields[number]['name'];
type DisallowableExpenseField = `${ExpenseField}Disallowable`;

export type QuarterlyIncomeTransfer = {
  mode: 'consolidated' | 'itemised';
  income: Record<IncomeField, string>;
  consolidatedExpenses: string;
  consolidatedDisallowableExpenses: string;
  expenses: Record<ExpenseField, string>;
  disallowableExpenses: Record<DisallowableExpenseField, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAmount(value: unknown): value is string {
  return typeof value === 'string' && (
    value.trim() === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)
  );
}

function hasAmounts(value: unknown, fields: readonly { name: string }[]) {
  return isRecord(value) && fields.every((field) => isAmount(value[field.name]));
}

export function parseQuarterlyIncomeTransfer(raw: string): QuarterlyIncomeTransfer | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (
    !isRecord(value)
    || (value.mode !== 'consolidated' && value.mode !== 'itemised')
    || !isAmount(value.consolidatedExpenses)
    || !isAmount(value.consolidatedDisallowableExpenses)
    || !hasAmounts(value.income, incomeFields)
    || !hasAmounts(value.expenses, expenseFields)
    || !hasAmounts(value.disallowableExpenses, disallowableExpenseFields)
  ) {
    return undefined;
  }

  return value as QuarterlyIncomeTransfer;
}
