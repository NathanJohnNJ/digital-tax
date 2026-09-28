'use client';
import { createContext, useContext, useRef, useState } from 'react';

export type AmountRow = {
  id: number;
  field: string;
  value: string;
};

export const incomeFields = [
  { name: 'turnover', label: 'Turnover' },
  { name: 'other', label: 'Other income' },
  { name: 'taxTakenOffTradingIncome', label: 'Tax taken off trading income' },
] as const;

export const expenseFields = [
  { name: 'costOfGoods', label: 'Cost of goods' },
  { name: 'paymentsToSubcontractors', label: 'Payments to subcontractors' },
  { name: 'wagesAndStaffCosts', label: 'Wages and staff costs' },
  { name: 'carVanTravelExpenses', label: 'Car, van and travel expenses' },
  { name: 'premisesRunningCosts', label: 'Premises running costs' },
  { name: 'maintenanceCosts', label: 'Maintenance costs' },
  { name: 'adminCosts', label: 'Administrative costs' },
  { name: 'businessEntertainmentCosts', label: 'Business entertainment' },
  { name: 'advertisingCosts', label: 'Advertising' },
  { name: 'interestOnBankOtherLoans', label: 'Interest on bank and other loans' },
  { name: 'financeCharges', label: 'Finance charges' },
  { name: 'irrecoverableDebts', label: 'Irrecoverable debts' },
  { name: 'professionalFees', label: 'Professional fees' },
  { name: 'depreciation', label: 'Depreciation' },
  { name: 'otherExpenses', label: 'Other expenses' },
] as const;

export const disallowableExpenseFields = expenseFields.map(({ name, label }) => ({
  name: `${name}Disallowable`,
  label: `${label} disallowable`,
}));

export type AmountKind = 'income' | 'expense' | 'disallowable';

type CalculatorState = {
  income: AmountRow[];
  expense: AmountRow[];
  disallowableExpense: AmountRow[];
  incomeTotal: string;
  expenseTotal: string;
  disallowableExpenseTotal: string;
  updateRow: (kind: AmountKind, index: number, value: string) => void;
  addRow: (kind: AmountKind, field: string) => void;
  removeRow: (kind: AmountKind, index: number) => void;
  setIncomeTotal: (value: string) => void;
  setExpenseTotal: (value: string) => void;
  setDisallowableExpenseTotal: (value: string) => void;
};

const CalculatorStateContext = createContext<CalculatorState | null>(null);

function calculateRowsTotal(rows: AmountRow[]) {
  return rows.reduce((total, row) => total + (Number(row.value) || 0), 0);
}

export function CalculatorStateProvider({ children }: { children: React.ReactNode }) {
  const nextId = useRef(incomeFields.length + expenseFields.length + disallowableExpenseFields.length);
  const [income, setIncome] = useState<AmountRow[]>(incomeFields.map((field, index) => ({ id: index, field: field.name, value: '0.00' })));
  const [expense, setExpense] = useState<AmountRow[]>(expenseFields.map((field, index) => ({ id: index + incomeFields.length, field: field.name, value: '0.00' })));
  const [disallowableExpense, setDisallowableExpense] = useState<AmountRow[]>(disallowableExpenseFields.map((field, index) => ({ id: index + incomeFields.length + expenseFields.length, field: field.name, value: '0.00' })));
  const [incomeTotal, setIncomeTotal] = useState('0.00');
  const [expenseTotal, setExpenseTotal] = useState('0.00');
  const [disallowableExpenseTotal, setDisallowableExpenseTotal] = useState('0.00');

  function updateRow(kind: AmountKind, index: number, value: string) {
    const setRows = kind === 'income' ? setIncome : kind === 'expense' ? setExpense : setDisallowableExpense;
    const setTotal = kind === 'income'
      ? setIncomeTotal
      : kind === 'expense'
        ? setExpenseTotal
        : setDisallowableExpenseTotal;

    setRows((current) => {
      const nextRows = current.map((row, rowIndex) => rowIndex === index ? { ...row, value } : row);
      setTotal(calculateRowsTotal(nextRows).toFixed(2));
      return nextRows;
    });
  }

  function addRow(kind: AmountKind, field: string) {
    const setRows = kind === 'income' ? setIncome : kind === 'expense' ? setExpense : setDisallowableExpense;
    setRows((current) => [...current, { id: nextId.current++, field, value: '0.00' }]);
  }

  function removeRow(kind: AmountKind, index: number) {
    const setRows = kind === 'income' ? setIncome : kind === 'expense' ? setExpense : setDisallowableExpense;
    const setTotal = kind === 'income'
      ? setIncomeTotal
      : kind === 'expense'
        ? setExpenseTotal
        : setDisallowableExpenseTotal;

    setRows((current) => {
      const nextRows = current.filter((_, rowIndex) => rowIndex !== index);
      setTotal(calculateRowsTotal(nextRows).toFixed(2));
      return nextRows;
    });
  }

  return (
    <CalculatorStateContext.Provider value={{
      income,
      expense,
      disallowableExpense,
      incomeTotal,
      expenseTotal,
      disallowableExpenseTotal,
      updateRow,
      addRow,
      removeRow,
      setIncomeTotal,
      setExpenseTotal,
      setDisallowableExpenseTotal,
    }}>
      {children}
    </CalculatorStateContext.Provider>
  );
}

export function useCalculatorState() {
  const state = useContext(CalculatorStateContext);
  if (!state) {
    throw new Error('useCalculatorState must be used inside CalculatorStateProvider');
  }
  return state;
}

export function rowsTotal(rows: AmountRow[]) {
  return calculateRowsTotal(rows);
}