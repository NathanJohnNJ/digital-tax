'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';
import { formatDisplayDate } from '@/app/api/utils/ukTaxYear';

type AnnualSummaryProps = {
  nino?: string;
  businessId?: string;
  startDate?: string;
  endDate?: string;
};

type AnnualGroup = 'adjustments' | 'allowances';
type AnnualField = { group: AnnualGroup; name: string; label: string; description: string };
type AnnualSubmission = Record<string, unknown>;

const annualFields: AnnualField[] = [
  { group: 'adjustments', name: 'includedNonTaxableProfits', label: 'Non-taxable profits included in turnover', description: 'Profits included in the accounts that are not taxable.' },
  { group: 'adjustments', name: 'basisAdjustment', label: 'Basis period adjustment', description: 'Adjustment needed to align accounting profits with the tax year.' },
  { group: 'adjustments', name: 'overlapReliefUsed', label: 'Overlap relief used', description: 'Overlap profits being relieved for this tax year.' },
  { group: 'adjustments', name: 'accountingAdjustment', label: 'Accounting adjustment', description: 'Any other adjustment to the accounting profit.' },
  { group: 'adjustments', name: 'outstandingBusinessIncome', label: 'Outstanding business income', description: 'Income received after the accounting period that relates to it.' },
  { group: 'adjustments', name: 'balancingChargeBpra', label: 'Balancing charge: business premises renovation', description: 'Balancing charge for business premises renovation allowance.' },
  { group: 'adjustments', name: 'balancingChargeOther', label: 'Other balancing charges', description: 'Other balancing charges for the business.' },
  { group: 'adjustments', name: 'goodsAndServicesOwnUse', label: 'Goods or services taken for personal use', description: 'Value of business goods or services used personally.' },
  { group: 'allowances', name: 'tradingIncomeAllowance', label: 'Trading income allowance', description: 'Claim this instead of deducting business expenses.' },
  { group: 'allowances', name: 'annualInvestmentAllowance', label: 'Annual investment allowance', description: 'Qualifying plant and machinery expenditure.' },
  { group: 'allowances', name: 'capitalAllowanceMainPool', label: 'Capital allowance: main pool', description: 'Writing-down allowance for the main pool.' },
  { group: 'allowances', name: 'capitalAllowanceSpecialRatePool', label: 'Capital allowance: special rate pool', description: 'Writing-down allowance for the special rate pool.' },
  { group: 'allowances', name: 'zeroEmissionsGoodsVehicleAllowance', label: 'Zero-emissions goods vehicle allowance', description: 'Allowance for qualifying zero-emissions goods vehicles.' },
  { group: 'allowances', name: 'businessPremisesRenovationAllowance', label: 'Business premises renovation allowance', description: 'Qualifying renovation expenditure.' },
  { group: 'allowances', name: 'enhancedCapitalAllowance', label: 'Enhanced capital allowance', description: 'Other qualifying enhanced capital allowance.' },
  { group: 'allowances', name: 'allowanceOnSales', label: 'Allowance on sale of assets', description: 'Allowance due when qualifying assets are sold.' },
  { group: 'allowances', name: 'capitalAllowanceSingleAssetPool', label: 'Capital allowance: single asset pool', description: 'Writing-down allowance for a single asset pool.' },
  { group: 'allowances', name: 'electricChargePointAllowance', label: 'Electric charge-point allowance', description: 'Allowance for qualifying electric charge points.' },
  { group: 'allowances', name: 'zeroEmissionsCarAllowance', label: 'Zero-emissions car allowance', description: 'Allowance for qualifying zero-emissions cars.' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTaxYear(endDate: string) {
  const [year, month, day] = endDate.split('-').map(Number);
  const startYear = month > 4 || (month === 4 && day >= 6) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function MoneyField({
  field,
  value,
  onChange,
}: {
  field: AnnualField;
  value: string;
  onChange: (name: string, value: string) => void;
}) {
  const id = `annual-${field.name}`;
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
      <span>{field.label}</span>
      <span className="flex items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <span className="text-gray-500">£</span>
        <input
          id={id}
          type="number"
          step="0.01"
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="number-no-spinner w-full bg-transparent py-2 pl-2 text-right font-normal text-gray-900 outline-none"
        />
      </span>
      <span className="font-normal text-gray-500">{field.description}</span>
    </label>
  );
}

export default function AnnualSummary({ nino, businessId, startDate, endDate }: AnnualSummaryProps) {
  const validPeriod = Boolean(startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate));
  const taxYear = validPeriod ? getTaxYear(endDate!) : undefined;
  const [existing, setExisting] = useState<AnnualSubmission>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [businessDetailsChangedRecently, setBusinessDetailsChangedRecently] = useState(false);
  const [class4NicsExemptionReason, setClass4NicsExemptionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>();

  useEffect(() => {
    if (!nino || !businessId || !taxYear) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadAnnualSubmission() {
      setLoading(true);
      try {
        const clientData = await buildClientPayload();
        const response = await fetch('/api/hmrc/userRestrictedAuth/annualSubmission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'retrieve', clientData, nino, businessId, taxYear }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not retrieve the annual summary.');
        const submission = isRecord(result.submission) ? result.submission : {};
        const nextValues: Record<string, string> = {};
        for (const field of annualFields) {
          const group = submission[field.group];
          if (isRecord(group) && typeof group[field.name] === 'number') nextValues[field.name] = String(group[field.name]);
        }
        const nonFinancials = isRecord(submission.nonFinancials) ? submission.nonFinancials : {};
        if (!cancelled) {
          setExisting(submission);
          setValues(nextValues);
          setBusinessDetailsChangedRecently(nonFinancials.businessDetailsChangedRecently === true);
          setClass4NicsExemptionReason(typeof nonFinancials.class4NicsExemptionReason === 'string' ? nonFinancials.class4NicsExemptionReason : '');
        }
      } catch (loadError) {
        if (!cancelled) {
          setMessage({ kind: 'error', text: loadError instanceof Error ? loadError.message : 'Could not retrieve the annual summary.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAnnualSubmission();
    return () => { cancelled = true; };
  }, [nino, businessId, taxYear]);

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function saveAnnualSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nino || !businessId || !taxYear) return;
    setSaving(true);
    setMessage(undefined);

    const submission: AnnualSubmission = { ...existing };
    for (const groupName of ['adjustments', 'allowances'] as const) {
      const group = isRecord(submission[groupName]) ? { ...submission[groupName] } : {};
      for (const field of annualFields.filter((item) => item.group === groupName)) {
        const enteredValue = values[field.name]?.trim();
        if (!enteredValue) {
          delete group[field.name];
          continue;
        }
        const amount = Number(enteredValue);
        if (!Number.isFinite(amount) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
          setMessage({ kind: 'error', text: `${field.label} must be a valid amount with up to two decimal places.` });
          setSaving(false);
          return;
        }
        group[field.name] = amount;
      }
      if (Object.keys(group).length > 0) submission[groupName] = group;
      else delete submission[groupName];
    }

    const nonFinancials = isRecord(submission.nonFinancials) ? { ...submission.nonFinancials } : {};
    nonFinancials.businessDetailsChangedRecently = businessDetailsChangedRecently;
    if (class4NicsExemptionReason) nonFinancials.class4NicsExemptionReason = class4NicsExemptionReason;
    else delete nonFinancials.class4NicsExemptionReason;
    submission.nonFinancials = nonFinancials;

    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/userRestrictedAuth/annualSubmission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', clientData, nino, businessId, taxYear, annualSubmission: submission }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'HMRC could not save the annual summary.');
      setExisting(submission);
      setMessage({ kind: 'success', text: 'The self-employment annual summary was saved with HMRC.' });
    } catch (saveError) {
      setMessage({ kind: 'error', text: saveError instanceof Error ? saveError.message : 'The annual summary could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  if (!validPeriod || !nino || !businessId) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 p-4 shadow-md">
        <p className="text-center text-gray-700">This tax return link is missing a valid business or tax year. Open it from the year-end obligations list.</p>
      </div>
    );
  }

  const adjustmentFields = annualFields.filter((field) => field.group === 'adjustments');
  const allowanceFields = annualFields.filter((field) => field.group === 'allowances');

  return (
    <div className="mt-6 rounded-2xl border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 p-4 shadow-2xl">
      <div className="mb-5 border-b border-sky-100 pb-4">
        <h2 className="text-center text-2xl font-extrabold">Self-employment annual summary</h2>
        <dl className="mx-auto mt-3 grid max-w-2xl grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm sm:text-base">
          <dt className="font-semibold text-gray-700">Tax year</dt><dd>{taxYear}</dd>
          <dt className="font-semibold text-gray-700">Period</dt><dd>{formatDisplayDate(startDate!)} to {formatDisplayDate(endDate!)}</dd>
          <dt className="font-semibold text-gray-700">Business ID</dt><dd className="break-all">{businessId}</dd>
        </dl>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-700">
          Enter annual allowances and adjustments for this self-employment business. These figures supplement, rather than replace, its quarterly updates.
        </p>
      </div>

      {loading ? <p className="py-6 text-center text-gray-600">Loading the annual summary...</p> : (
        <form onSubmit={saveAnnualSummary} className="mx-auto flex max-w-4xl flex-col gap-6">
          <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
            <legend className="px-2 text-xl font-bold text-gray-900">Annual adjustments</legend>
            <div className="grid gap-4 md:grid-cols-2">
              {adjustmentFields.map((field) => (
                <MoneyField key={field.name} field={field} value={values[field.name] ?? ''} onChange={updateValue} />
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
            <legend className="px-2 text-xl font-bold text-gray-900">Allowances</legend>
            <p className="mb-4 text-sm text-gray-600">Only enter claims that apply to this business and tax year. Leave other fields blank.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {allowanceFields.map((field) => (
                <MoneyField key={field.name} field={field} value={values[field.name] ?? ''} onChange={updateValue} />
              ))}
            </div>
            {Number(values.tradingIncomeAllowance) > 0 && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                HMRC does not allow the trading income allowance to be claimed alongside business expenses. Review and amend the final quarterly summary as required before submitting this allowance.
              </p>
            )}
          </fieldset>

          <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
            <legend className="px-2 text-xl font-bold text-gray-900">Business information</legend>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={businessDetailsChangedRecently} onChange={(event) => setBusinessDetailsChangedRecently(event.target.checked)} className="mt-1" />
              Business details changed recently
            </label>
            <label htmlFor="class4-reason" className="mt-4 flex max-w-xl flex-col gap-1 text-sm font-semibold text-gray-700">
              Class 4 National Insurance exemption reason
              <select id="class4-reason" value={class4NicsExemptionReason} onChange={(event) => setClass4NicsExemptionReason(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal">
                <option value="">No exemption reason</option>
                <option value="non-resident">Non-resident</option>
                <option value="under-16">Under 16</option>
                <option value="over-state-pension-age">Over State Pension age</option>
                <option value="under-state-pension-age">Under State Pension age</option>
              </select>
            </label>
          </fieldset>

          <div className="rounded-lg border border-sky-200 bg-white/70 p-4 text-sm text-gray-700">
            <h3 className="font-bold text-gray-900">Before finalising</h3>
            <p className="mt-1">HMRC requires all income sources and any other claims or reliefs to be submitted before a final tax calculation and declaration. This page submits the self-employment annual summary only.</p>
          </div>

          {message && <p role="status" className={message.kind === 'success' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{message.text}</p>}

          <button type="submit" disabled={saving} className="w-fit self-center rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-4 py-2 font-semibold text-white shadow-sm hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Saving...' : 'Save annual summary with HMRC'}
          </button>
        </form>
      )}
    </div>
  );
}