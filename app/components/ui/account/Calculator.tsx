'use client';
import { useState } from 'react';
import Input from './Input';
import clsx from 'clsx';
import { MinusIcon } from 'lucide-react';
import { AmountRow, rowsTotal, useCalculatorState } from './context/CalculatorState';

export default function Calculator(){
  const { income, expense, updateRow, addRow, removeRow } = useCalculatorState();
  const [visible, setVisible] = useState(false);

  function table(title: string, kind: 'income' | 'expense', rows: AmountRow[]){
    const borderColor = title === 'Income' ? 'border-blue-500' : 'border-red-500';
    return (
      <div className={`table-auto rounded-lg border border-collapse ${borderColor} shadow-md`}>
        <h3 className={`p-3 border ${borderColor} rounded-t-lg w-full text-center font-extrabold`}>{title}</h3>
        <div className={`border ${borderColor} rounded-b-lg`}>
          {rows.map((row, index) => (
            <div className={clsx(`flex border-b ${borderColor} bg-gray-200/20 hover:bg-gray-100/5`, { 'bg-gray-700/10 hover:bg-gray-700/5': index % 2 === 0 })} key={row.id}>
              <Input amount={row.value} onChange={(value) => updateRow(kind, index, value)} onAdd={() => addRow(kind)} />
              {index > 0 && <button type="button" className="border border-slate-500 m-1 rounded-xl px-1.75 h-min bg-linear-to-tr from-slate-300 to-slate-50 hover:from-slate-50 hover:scale-115 text-gray-600 shadow-2xs hover:shadow-sm" title="Remove row" onClick={() => removeRow(kind, index)}><MinusIcon className="h-8 w-4" /></button>}
            </div>
          ))}
          <div className="flex border-b bg-gray-200/20 border-t"><h4 className="w-32 text-right -ms-1">£{rowsTotal(rows).toFixed(2)}</h4></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => setVisible((current) => !current)} className="w-fit border-2 border-blue-500 rounded-xl px-3 py-1 mb-4 hover:scale-105 shadow-sm hover:shadow-lg font-medium">{visible ? 'Hide calculators' : 'Show calculators'}</button>
      {visible && <div className="grid items-start gap-4 md:grid-cols-2">
        {table('Income', 'income', income)}
        {table('Expenses', 'expense', expense)}
      </div>}
    </div>
  )
}