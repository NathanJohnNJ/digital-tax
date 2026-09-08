'use client';
import { useCalculatorState } from './context/CalculatorState';

export default function IncomeExpense(){
  const { incomeTotal, expenseTotal, setIncomeTotal, setExpenseTotal } = useCalculatorState();
  const incomeAmount = Number(incomeTotal) || 0;
  const expenseAmount = Number(expenseTotal) || 0;

  return (
    <div className="border border-gray-500 m-4 rounded-lg shadow-lg">
      <div className="rounded-t-lg flex w-full">
        <div className="p-3 border border-gray-500 border-r-0 text-left rounded-tl-lg w-1/2 font-extrabold">Total Income</div>
        <div className="p-3 border border-gray-500 rounded-tr-lg w-1/2"><label className="sr-only" htmlFor="income-total">Total income</label><input id="income-total" type="number" min="0" step="0.01" value={incomeTotal} onChange={(event) => setIncomeTotal(event.target.value)} className="number-no-spinner w-full text-right" /></div>
      </div>
      <div className="flex w-full">
        <div className="p-3 border border-gray-500 border-r-0 border-t-0 text-left w-1/2 font-extrabold text-nowrap">Total Expendature</div>
        <div className="p-3 border border-gray-500 border-t-0 w-1/2"><label className="sr-only" htmlFor="expense-total">Total expenditure</label><input id="expense-total" type="number" min="0" step="0.01" value={expenseTotal} onChange={(event) => setExpenseTotal(event.target.value)} className="number-no-spinner w-full text-right" /></div>
      </div>
      <div className="flex rounded-b-lg w-full">
        <div className="p-3 border border-gray-500 font-black text-xl text-center rounded-bl-lg w-1/2">Total</div>
        <div className="p-3 border border-gray-500 font-black rounded-br-lg w-1/2"><input className="w-full text-right" disabled value={`£ ${(incomeAmount - expenseAmount).toFixed(2)}`} /></div>
      </div>
    </div>
  );
}