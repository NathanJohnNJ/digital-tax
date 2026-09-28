'use client';

import { useState, type FormEvent } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

type QuarterlyUpdatesProps = {
  nino?: string;
  businessId?: string;
  startDate?: string;
  endDate?: string;
};

type IncomeField = 'turnover' | 'other' | 'taxTakenOffTradingIncome';
type ExpenseField =
  | 'costOfGoods'
  | 'paymentsToSubcontractors'
  | 'wagesAndStaffCosts'
  | 'carVanTravelExpenses'
  | 'premisesRunningCosts'
  | 'maintenanceCosts'
  | 'adminCosts'
  | 'businessEntertainmentCosts'
  | 'advertisingCosts'
  | 'interestOnBankOtherLoans'
  | 'financeCharges'
  | 'irrecoverableDebts'
  | 'professionalFees'
  | 'depreciation'
  | 'otherExpenses';
type DisallowableExpenseField = `${ExpenseField}Disallowable`;

const expenseFields: { name: ExpenseField; label: string }[] = [
  { name: 'costOfGoods', label: 'Cost of goods' },
  { name: 'paymentsToSubcontractors', label: 'Payments to subcontractors' },
  { name: 'wagesAndStaffCosts', label: 'Wages and staff costs' },
  { name: 'carVanTravelExpenses', label: 'Car, van and travel expenses' },
  { name: 'premisesRunningCosts', label: 'Premises running costs' },
  { name: 'maintenanceCosts', label: 'Maintenance costs' },
  { name: 'adminCosts', label: 'Administrative costs' },
  { name: 'businessEntertainmentCosts', label: 'Business entertainment' },
  { name: 'advertisingCosts', label: 'Advertising' },
  { name: 'interestOnBankOtherLoans', label: 'Interest on loans' },
  { name: 'financeCharges', label: 'Finance charges' },
  { name: 'irrecoverableDebts', label: 'Irrecoverable debts' },
  { name: 'professionalFees', label: 'Professional fees' },
  { name: 'depreciation', label: 'Depreciation' },
  { name: 'otherExpenses', label: 'Other expenses' },
];

function isIsoDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getTaxYear(endDate: string) {
  const [year, month, day] = endDate.split('-').map(Number);
  const startYear = month > 4 || (month === 4 && day >= 6) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function getTaxYearStartDate(taxYear: string) {
  return `${taxYear.slice(0, 4)}-04-06`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function pounds(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function MoneyInput({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const id = `amount-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
      {label}
      <span className="flex items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <span className="text-gray-500">£</span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={onChange?(event) => onChange(event.target.value):undefined}
          disabled={disabled?true:false}
          className="number-no-spinner w-full bg-transparent py-2 pl-2 text-right font-normal text-gray-900 outline-none"
        />
      </span>
    </label>
  );
}

export default function QuarterlyUpdates({ nino, businessId, startDate, endDate }: QuarterlyUpdatesProps) {
  const [income, setIncome] = useState<Record<IncomeField, string>>({
    turnover: '0.00',
    other: '0.00',
    taxTakenOffTradingIncome: '0.00',
  });
  const [expenseMode, setExpenseMode] = useState<'consolidated' | 'itemised'>('consolidated');
  const [consolidatedExpenses, setConsolidatedExpenses] = useState('0.00');
  const [consolidatedDisallowableExpenses, setConsolidatedDisallowableExpenses] = useState('0.00');
  const [expenses, setExpenses] = useState<Record<ExpenseField, string>>(
    Object.fromEntries(expenseFields.map(({ name }) => [name, '0.00'])) as Record<ExpenseField, string>,
  );
  const [disallowableExpenses, setDisallowableExpenses] = useState<Record<DisallowableExpenseField, string>>(
    Object.fromEntries(expenseFields.map(({ name }) => [`${name}Disallowable`, '0.00'])) as Record<DisallowableExpenseField, string>,
  );
  const [confirmedThreshold, setConfirmedThreshold] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>();

  const validPeriod = isIsoDate(startDate) && isIsoDate(endDate) && startDate <= endDate;
  const validIdentity = Boolean(nino && businessId);
  const taxYear = validPeriod ? getTaxYear(endDate) : undefined;
  const isCumulative = Boolean(taxYear && Number(taxYear.slice(0, 4)) >= 2025);
  const expenseTotal = expenseMode === 'consolidated'
    ? Number(consolidatedExpenses) || 0
    : Object.values(expenses).reduce((total, amount) => total + (Number(amount) || 0), 0);
  const disallowableExpensesTotal = expenseMode === 'consolidated'
    ? Number(consolidatedDisallowableExpenses) || 0
    : Object.values(disallowableExpenses).reduce((total, amount) => total + (Number(amount) || 0), 0);
  const incomeTotal = (Number(income.turnover) || 0) + (Number(income.other) || 0) - (Number(income.taxTakenOffTradingIncome) || 0);
  const canSubmit = validPeriod && validIdentity && !submitting && (expenseMode !== 'consolidated' || confirmedThreshold);
  const netProfit = incomeTotal - expenseTotal;

  function updateIncome(field: IncomeField, value: string) {
    setIncome((current) => ({ ...current, [field]: value }));
  }

  function updateExpense(field: ExpenseField, value: string) {
    setExpenses((current) => ({ ...current, [field]: value }));
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !taxYear || !startDate || !endDate || !nino || !businessId) return;

    setSubmitting(true);
    setMessage(undefined);

    try {
      const clientData = await buildClientPayload();
      const periodExpenses = expenseMode === 'consolidated'
        ? { consolidatedExpenses: Number(consolidatedExpenses) || 0 }
        : Object.fromEntries(expenseFields.map(({ name }) => [name, Number(expenses[name]) || 0]));
      const request = await fetch('/api/hmrc/userRestrictedAuth/submitQuarterlyUpdate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientData,
          nino,
          businessId,
          taxYear,
          periodStartDate: isCumulative ? getTaxYearStartDate(taxYear) : startDate,
          periodEndDate: endDate,
          periodIncome: Object.fromEntries(
            Object.entries(income).map(([field, amount]) => [field, Number(amount) || 0]),
          ),
          periodExpenses,
          ...(expenseMode === 'itemised' && {
            periodDisallowableExpenses: Object.fromEntries(
              expenseFields.map(({ name }) => [`${name}Disallowable`, Number(disallowableExpenses[`${name}Disallowable`]) || 0]),
            ),
          }),
        }),
      });
      const result = await request.json().catch(() => ({}));

      if (!request.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'HMRC could not accept this update.');
      }

      setMessage({ kind: 'success', text: 'HMRC has received the quarterly update.' });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'The quarterly update could not be submitted.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!validPeriod || !validIdentity) {
    return (
      <div className="border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 shadow-md rounded-2xl p-4 mt-6">
        <p className="text-center text-gray-700">
          This update link is missing a valid business or reporting period. Return to your obligations and select a quarterly update.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 shadow-2xl rounded-2xl p-4 mt-6 flex flex-col w-full">
      <div className="mb-5 border-b border-sky-100 pb-4">
        <h2 className="font-extrabold text-2xl text-center">Review update period</h2>
        <dl className="mx-auto mt-4 grid max-w-2xl grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm sm:text-base">
          <dt className="font-semibold text-gray-700">Period</dt>
          <dd>{displayDate(startDate)} to {displayDate(endDate)}</dd>
          <dt className="font-semibold text-gray-700">Tax year</dt>
          <dd>{taxYear}</dd>
          <dt className="font-semibold text-gray-700">Business ID</dt>
          <dd className="break-all">{businessId}</dd>
        </dl>
        {isCumulative && taxYear && (
          <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-700">
            For {taxYear} HMRC requires cumulative totals. Enter figures from the start of the tax year through {displayDate(endDate)}; this submission covers {displayDate(getTaxYearStartDate(taxYear))} to {displayDate(endDate)}.
          </p>
        )}
      </div>

      <form onSubmit={submitUpdate} className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
          <legend className="px-2 text-xl font-bold text-gray-900">Revenue</legend>
          <MoneyInput label="Turnover" value={income.turnover} onChange={(value) => updateIncome('turnover', value)} />
          <MoneyInput label="Other income" value={income.other} onChange={(value) => updateIncome('other', value)} />
          <MoneyInput label="Tax taken off trading income" value={income.taxTakenOffTradingIncome} onChange={(value) => updateIncome('taxTakenOffTradingIncome', value)} />
        </fieldset>

        <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
          <legend className="px-2 text-xl font-bold text-gray-900">Expenses</legend>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="expense-mode" checked={expenseMode === 'consolidated'} onChange={() => setExpenseMode('consolidated')} />
              Consolidated expenses
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="expense-mode" checked={expenseMode === 'itemised'} onChange={() => setExpenseMode('itemised')} />
              Itemised expenses
            </label>
          </div>

          {expenseMode === 'consolidated' ? (
            <>
              <div className="space-y-3">
                <MoneyInput label="Total expenses" value={consolidatedExpenses} onChange={setConsolidatedExpenses} />
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={confirmedThreshold}
                    onChange={(event) => setConfirmedThreshold(event.target.checked)}
                    className="mt-1"
                  />
                  I confirm this business is eligible to use consolidated expenses (annual turnover below £90,000).
                </label>
              </div>
              <div className="mt-4">
                <MoneyInput label="Total disallowable expenses" value={consolidatedDisallowableExpenses} onChange={setConsolidatedDisallowableExpenses} />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {expenseFields.map(({ name, label }) => (
                  <MoneyInput key={name} label={label} value={expenses[name]} onChange={(value) => updateExpense(name, value)} />
                ))}
                  <MoneyInput label="Total expenses" value={String(expenseTotal.toFixed(2))} disabled/>
              </div>
              <details className="mt-4 border-t border-sky-100 pt-3">
                <summary className="cursor-pointer font-semibold text-gray-700">Disallowable expenses</summary>
                <p className="my-3 text-sm text-gray-600">Enter the part of each expense category that is not allowable for tax. Leave categories at zero when not applicable.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {expenseFields.map(({ name, label }) => (
                    <MoneyInput
                      key={`${name}-disallowable`}
                      label={`${label} not allowable`}
                      value={disallowableExpenses[`${name}Disallowable`]}
                      onChange={(value) => setDisallowableExpenses((current) => ({ ...current, [`${name}Disallowable`]: value }))}
                    />
                  ))}
                  <MoneyInput label="Total disallowable expenses" value={String(disallowableExpensesTotal.toFixed(2))} disabled/>
                </div>
              </details>
            </>
          )}
          
        </fieldset>

        <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
          <legend className="px-2 text-xl font-bold text-gray-900">Summary</legend>
          <dl className="-mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-gray-700">
            <dt>Total Revenue</dt><dd className="flex justify-self-end mr-2">{pounds(incomeTotal)}</dd>
            <dt></dt><dd className="flex justify-self-end -mt-3 -mb-5"> -</dd>
            <dt>Total Expenses</dt><dd className="flex justify-self-end mr-2">{pounds(expenseTotal)}</dd>
            <dt></dt><dd className="-mt-6 -mb-4">{pounds(incomeTotal-expenseTotal).split('').map((char)=>{return('_')})}___</dd>
            <dt className="font-bold text-gray-900">Net Profit</dt>
            <dd className="font-bold text-gray-900 mr-2">{pounds(netProfit)}</dd>
            <dt></dt><dd className="flex justify-self-end -mt-3 -mb-5"> +</dd>
            <dt>Disallowable Expenses</dt><dd className="flex justify-self-end mr-2">{pounds(disallowableExpensesTotal)}</dd>
            <dt></dt><dd className="-mt-6 -mb-4">{pounds((netProfit)).split('').map((char)=>{return('_')})}___</dd>
            <dt className="font-bold text-gray-900">Taxable Profit</dt>
            <dd className="font-bold text-gray-900 mr-2">{pounds(netProfit + disallowableExpensesTotal)}</dd>

          </dl>
        </fieldset>

        {message && (
          <p role="status" className={message.kind === 'success' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-fit self-center rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-4 py-2 font-semibold text-white shadow-sm hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit update to HMRC'}
        </button>
      </form>
    </div>
  )
}