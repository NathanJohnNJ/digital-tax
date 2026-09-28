'use client';
import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon, MinusIcon, PlusIcon } from 'lucide-react';
import {
  AmountKind,
  AmountRow,
  disallowableExpenseFields,
  expenseFields,
  incomeFields,
  rowsTotal,
  useCalculatorState,
} from './context/CalculatorState';

type CalculatorField = { name: string; label: string };

export default function Calculator(){
  const { income, expense, disallowableExpense, updateRow, addRow, removeRow } = useCalculatorState();
  const [visible, setVisible] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Record<AmountKind, boolean>>({
    income: false,
    expense: false,
    disallowable: false,
  });

  function table(title: string, kind: AmountKind, rows: AmountRow[], fields: readonly CalculatorField[]){
    const borderColor = kind === 'income' ? 'border-blue-500/60 hover:border-blue-500' : kind === 'expense' ? 'border-red-500/40 hover:border-red-500' : 'border-amber-500/40 hover:border-amber-500';
    const availableFields = fields.filter((field) => !rows.some((row) => row.field === field.name));
    const expanded = expandedTables[kind];

    return (
      <div className={`min-w-0 rounded-lg border ${borderColor} shadow-md ${title === "Income" ? 'row-span-1' : title === "Expense" ? 'row-span-5' : 'row-span-4'}`}>
        <div className={`grid grid-cols-[1fr_2rem] items-center gap-2 p-3 border ${borderColor} border-b-2 rounded-t-lg w-full`}>
          <h3 className="text-center font-extrabold">{title}</h3>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-400 bg-linear-to-tr from-slate-300 to-slate-50 text-gray-600 shadow-2xs hover:from-slate-50 hover:shadow-sm"
            title={`${expanded ? 'Hide' : 'Show'} ${title.toLowerCase()} fields`}
            aria-label={`${expanded ? 'Hide' : 'Show'} ${title.toLowerCase()} fields`}
            aria-expanded={expanded}
            onClick={() => setExpandedTables((current) => ({ ...current, [kind]: !current[kind] }))}
          >
            <ChevronDownIcon className={clsx('h-4 w-4 transition-transform duration-200', { 'rotate-180': expanded })} />
          </button>
        </div>
        <div className="rounded-b-lg" hidden={!expanded}>
          {rows.map((row, index) => (
            <div className={clsx(`grid grid-cols-[minmax(0,1fr)_5rem_2rem_2rem] grid-rows-1 items-center gap-2 border-b border-l border-r ${borderColor} px-2 py-2`, { 'bg-gray-700/10': index % 2 === 0 })} key={row.id}>
              <label htmlFor={`${kind}-${row.id}`} className="min-w-0 text-sm text-gray-700">{fields.find((field) => field.name === row.field)?.label ?? row.field}</label>
              <input
                id={`${kind}-${row.id}`}
                type="number"
                min="0"
                step="0.01"
                value={row.value}
                onChange={(event) => updateRow(kind, index, event.target.value)}
                onBlur={(event) => updateRow(kind, index, (Number(event.target.value) || 0).toFixed(2))}
                className="number-no-spinner w-full rounded-lg border border-gray-400/50 bg-white px-2 py-1 text-right text-sm"
              />
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-400 bg-linear-to-tr from-slate-300 to-slate-50 text-gray-600 shadow-2xs hover:from-slate-50 hover:shadow-sm"
                title={`Remove ${fields.find((field) => field.name === row.field)?.label ?? row.field}`}
                aria-label={`Remove ${fields.find((field) => field.name === row.field)?.label ?? row.field}`}
                onClick={() => removeRow(kind, index)}
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              {index === rows.length - 1 ? (
              <details className="group relative inline-flex">
              <summary
                className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-400 bg-linear-to-tr from-slate-300 to-slate-50 text-gray-600 shadow-2xs hover:from-slate-50 hover:shadow-sm [&::-webkit-details-marker]:hidden"
                title={`Add ${title.toLowerCase()} field`}
                aria-label={`Add ${title.toLowerCase()} field`}
              >
                <PlusIcon className="h-4 w-4" />
              </summary>
              <div className="absolute bottom-full right-0 z-20 mb-2 max-h-56 w-64 overflow-y-auto rounded-lg border border-gray-300 bg-white p-1 shadow-xl">
                {availableFields.length > 0 ? availableFields.map((field) => (
                  <button
                    key={field.name}
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-sky-50"
                    onClick={(event) => {
                      addRow(kind, field.name);
                      const details = event.currentTarget.closest('details');
                      if (details) details.open = false;
                    }}
                  >
                    {field.label}
                  </button>
                )) : <p className="px-3 py-2 text-sm text-gray-500">All fields are in the table</p>}
              </div>
            </details>
              ) : <span aria-hidden="true" />}
            </div>
          ))}
          <div className={`flex items-center justify-end border rounded-b-lg ${borderColor} bg-gray-200/20 px-2 py-2`}>
            <div className="flex items-center gap-3 mr-22">
              <h4 className="font-bold text-gray-700">Total</h4>
              <p className="min-w-24 text-right font-extrabold text-gray-900">£{rowsTotal(rows).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => setVisible((current) => !current)} className="w-fit border-2 border-blue-500 rounded-xl px-3 py-1 mb-4 hover:scale-105 shadow-sm hover:shadow-lg font-medium">{visible ? 'Hide calculators' : 'Show calculators'}</button>
      {visible && <div className="grid w-full items-start gap-4 grid-flow-col md:grid-cols-2 2xl:grid-cols-3 grid-rows-5">
        {table('Income', 'income', income, incomeFields)}
        {table('Disallowable expenses', 'disallowable', disallowableExpense, disallowableExpenseFields)}
        {table('Expenses', 'expense', expense, expenseFields)}
      </div>}
    </div>
  );
}