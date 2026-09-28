import Calculator from '@/app/components/ui/account/Calculator';
import IncomeExpense from '@/app/components/ui/account/IncomeExpense';
import { CalculatorStateProvider } from '@/app/components/ui/account/context/CalculatorState';

export default async function Page(){

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-sky-75 w-[99%] h-full border-2 -z-50 border-blue-500 rounded-2xl transition-all duration-75">
      <div className="w-full h-full rounded-2xl bg-white p-6 overflow-y-scroll scrollbar-none flex flex-col items-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-10 mt-4">Income & Expendature</h1>
        <CalculatorStateProvider>
          <div className="grid grid-cols-6 gap-4 grid-rows-1">
            <p className="border-2 border-blue-500 shadow-lg p-3 h-fit rounded-lg bg-white col-start-1 col-span-3 row-start-1 italic">
              Use the table to the right to input your income and expendature to get a total which you can use when submitting your quartely updates or year end total. If you haven't totaled the amounts yet, press the 'Show Calculators' button below to enter your individual income/expense amounts and generate a total for the quarter/year.
            </p>
            <div className="col-start-4 col-span-3 row-start-1">
              <IncomeExpense />
            </div>
            <div className="row-start-2 col-span-6">
              <Calculator />
            </div>
          </div>
        </CalculatorStateProvider>
      </div>
    </div>
  )
}