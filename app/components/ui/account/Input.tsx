'use client';
import { PlusIcon } from 'lucide-react';

type IncomeInputProps = {
  amount: string;
  onChange: (value: string) => void;
  onAdd: () => void;
};

export default function Input({ amount, onChange, onAdd }: IncomeInputProps){
  function formatAmount(){
    const parsedAmount = Number(amount);
    onChange(Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : '0.00');
  }

  return (
    <form className="w-min flex items-center" onSubmit={(event)=>{event.preventDefault(); onAdd()}}>
      <input type="number" min="0" step="0.01" value={amount} onChange={(event)=>onChange(event.target.value)} onBlur={formatAmount} className="number-no-spinner pr-2 text-right w-32 bg-white rounded-lg ms-1 border-gray-400/50 border" />
      <button type="submit" className="border border-slate-500 m-1 rounded-xl px-1.75 h-min bg-linear-to-tr from-slate-300 to-slate-50 hover:from-slate-50 hover:scale-115 text-gray-600 shadow-2xs hover:shadow-sm"><PlusIcon className="h-8 w-4" /></button>
    </form>
  )
}