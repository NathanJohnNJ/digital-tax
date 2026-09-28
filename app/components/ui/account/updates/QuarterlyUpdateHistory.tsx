'use client';

import { useEffect, useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

type QuarterlyUpdateHistoryProps = {
  nino?: string;
  businessId?: string;
  endDate?: string;
};

type SubmittedUpdate = {
  periodDates?: {
    periodStartDate?: string;
    periodEndDate?: string;
  };
  periodIncome?: Record<string, number>;
  periodExpenses?: Record<string, number>;
  receivedDate?: string;
  isCumulative?: boolean;
};

function taxYearForDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const startYear = month > 4 || (month === 4 && day >= 6) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function displayDate(value?: string) {
  if (!value) return 'Date not available from HMRC';
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Date not available from HMRC';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function money(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function total(values?: Record<string, number>) {
  if (!values) return 0;
  return Object.values(values).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function expensesTotal(expenses?: Record<string, number>) {
  if (!expenses) return 0;
  if (typeof expenses.consolidatedExpenses === 'number') return expenses.consolidatedExpenses;
  return total(expenses);
}

export default function QuarterlyUpdateHistory({ nino, businessId, endDate }: QuarterlyUpdateHistoryProps) {
  const [updates, setUpdates] = useState<SubmittedUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const validEndDate = Boolean(endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate));
  const taxYear = validEndDate ? taxYearForDate(endDate!) : undefined;

  useEffect(() => {
    if (!nino || !businessId || !taxYear) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUpdates() {
      setLoading(true);
      setError(undefined);
      try {
        const clientData = await buildClientPayload();
        const response = await fetch('/api/hmrc/userRestrictedAuth/quarterlyUpdateHistory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientData, nino, businessId, taxYear }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof result.error === 'string' ? result.error : 'Could not retrieve submitted updates.');
        }
        if (!cancelled) setUpdates(Array.isArray(result.updates) ? result.updates : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not retrieve submitted updates.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUpdates();
    return () => { cancelled = true; };
  }, [nino, businessId, taxYear]);

  return (
    <section className="border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 shadow-md rounded-2xl p-4 mt-6">
      <h2 className="font-extrabold text-2xl text-center">Submitted updates{taxYear ? `: ${taxYear}` : ''}</h2>
      {loading ? (
        <p className="mt-3 text-center text-gray-600">Loading submitted updates...</p>
      ) : error ? (
        <p role="alert" className="mt-3 text-center text-red-700">{error}</p>
      ) : updates.length === 0 ? (
        <p className="mt-3 text-center text-gray-600">No submitted updates were found for this tax year.</p>
      ) : (
        <div className="mt-3 divide-y divide-sky-100">
          {updates.map((update, index) => {
            const income = update.periodIncome ?? {};
            const expenses = update.periodExpenses ?? {};
            const incomeTotal = (Number(income.turnover) || 0) + (Number(income.other) || 0);
            const costs = expensesTotal(expenses);
            const periodStart = update.periodDates?.periodStartDate;
            const periodEnd = update.periodDates?.periodEndDate;

            return (
              <article key={`${periodStart ?? 'period'}-${periodEnd ?? index}`} className="py-4 first:pt-2 last:pb-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-bold text-gray-900">
                    {periodStart && periodEnd ? `${displayDate(periodStart)} to ${displayDate(periodEnd)}` : 'Submitted period'}
                    {update.isCumulative && <span className="ml-2 text-sm font-medium text-gray-600">Cumulative summary</span>}
                  </h3>
                  <p className="text-sm text-gray-600">Submitted {displayDate(update.receivedDate)}</p>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div><dt className="text-gray-600">Turnover</dt><dd className="font-semibold">{money(Number(income.turnover) || 0)}</dd></div>
                  <div><dt className="text-gray-600">Other income</dt><dd className="font-semibold">{money(Number(income.other) || 0)}</dd></div>
                  <div><dt className="text-gray-600">Expenses</dt><dd className="font-semibold">{money(costs)}</dd></div>
                  <div><dt className="text-gray-600">Profit</dt><dd className="font-semibold">{money(incomeTotal - costs)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}