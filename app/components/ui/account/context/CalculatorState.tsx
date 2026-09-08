'use client';
import { createContext, useContext, useRef, useState } from 'react';

export type AmountRow = {
  id: number;
  value: string;
};

type AmountKind = 'income' | 'expense';

type CalculatorState = {
  income: AmountRow[];
  expense: AmountRow[];
  incomeTotal: string;
  expenseTotal: string;
  updateRow: (kind: AmountKind, index: number, value: string) => void;
  addRow: (kind: AmountKind) => void;
  removeRow: (kind: AmountKind, index: number) => void;
  setIncomeTotal: (value: string) => void;
  setExpenseTotal: (value: string) => void;
};

const CalculatorStateContext = createContext<CalculatorState | null>(null);

function calculateRowsTotal(rows: AmountRow[]) {
  return rows.reduce((total, row) => total + (Number(row.value) || 0), 0);
}

export function CalculatorStateProvider({ children }: { children: React.ReactNode }) {
  const nextId = useRef(1);
  const [income, setIncome] = useState<AmountRow[]>([{ id: 0, value: '0.00' }]);
  const [expense, setExpense] = useState<AmountRow[]>([{ id: 0, value: '0.00' }]);
  const [incomeTotal, setIncomeTotal] = useState('0.00');
  const [expenseTotal, setExpenseTotal] = useState('0.00');

  function updateRow(kind: AmountKind, index: number, value: string) {
    const setRows = kind === 'income' ? setIncome : setExpense;
    const setTotal = kind === 'income' ? setIncomeTotal : setExpenseTotal;

    setRows((current) => {
      const nextRows = current.map((row, rowIndex) => rowIndex === index ? { ...row, value } : row);
      setTotal(calculateRowsTotal(nextRows).toFixed(2));
      return nextRows;
    });
  }

  function addRow(kind: AmountKind) {
    const setRows = kind === 'income' ? setIncome : setExpense;
    setRows((current) => [...current, { id: nextId.current++, value: '0.00' }]);
  }

  function removeRow(kind: AmountKind, index: number) {
    const setRows = kind === 'income' ? setIncome : setExpense;
    const setTotal = kind === 'income' ? setIncomeTotal : setExpenseTotal;

    setRows((current) => {
      const nextRows = current.filter((_, rowIndex) => rowIndex !== index);
      setTotal(calculateRowsTotal(nextRows).toFixed(2));
      return nextRows.length > 0 ? nextRows : [{ id: nextId.current++, value: '0.00' }];
    });
  }

  return (
    <CalculatorStateContext.Provider value={{ income, expense, incomeTotal, expenseTotal, updateRow, addRow, removeRow, setIncomeTotal, setExpenseTotal }}>
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