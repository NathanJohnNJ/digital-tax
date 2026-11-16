import Calculator from '@/app/components/ui/account/Calculator';
import IncomeExpense from '@/app/components/ui/account/IncomeExpense';
import IncomeToQuarterly from '@/app/components/ui/account/IncomeToQuarterly';
import { CalculatorStateProvider } from '@/app/components/ui/account/context/CalculatorState';

export default async function Page(){

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center p-2 sm:p-3 bg-sky-75 border-2 border-blue-500 rounded-2xl">
      <div className="w-full rounded-2xl bg-white p-3 sm:p-6 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-10 mt-4 text-center">Income & Expendature</h1>
        <CalculatorStateProvider>
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-6">
            <p className="order-1 border-2 border-blue-500 shadow-lg p-3 h-fit rounded-lg bg-white lg:col-start-1 lg:col-span-3 lg:row-start-1 italic">
              Use the table to the right to input your income and expendature to get a total which you can use when submitting your quartely updates or year end total. If you haven't totaled the amounts yet, press the 'Show Calculators' button below to enter your income and expense amounts and generate a total.
            </p>
            <p className="order-4 border-2 border-blue-500 shadow-lg p-3 h-fit rounded-lg bg-white lg:col-start-4 lg:col-span-3 lg:row-start-3 italic">
              Once you have finished filling in your totals, you can push the button to pass these values over to the ‘Quarterly Updates’ page ready for you to review and submit to HMRC. If you have used the calculators and filled in the itemised tables, then these will transfer over to the ‘Quarterly Updates’ page. If you haven’t used the calculators, but filled in your totals, then these will transfer over to a consolidated view on the ‘Quarterly Updates’ page.
            </p>
            <div className="order-2 min-w-0 lg:col-start-4 lg:col-span-3 lg:row-start-1">
              <IncomeExpense />
            </div>
            <div className="order-3 min-w-0 lg:row-start-2 lg:col-span-6">
              <Calculator />
            </div>
            <div className="order-5 min-w-0 lg:row-start-3 lg:col-span-3">
              <IncomeToQuarterly />
            </div>
          </div>
        </CalculatorStateProvider>
      </div>
    </div>
  )
}