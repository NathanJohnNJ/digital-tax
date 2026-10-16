'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';
import { formatDisplayDate } from '@/app/api/utils/ukTaxYear';
import IndividualTaxCalculation from '@/app/components/ui/account/IndividualTaxCalculation';
import SelfAssessmentTaxCalculations from '@/app/components/ui/account/SelfAssessmentTaxCalculations';

type AnnualSummaryProps = {
  nino?: string;
  businessId?: string;
  startDate?: string;
  endDate?: string;
};

type AnnualGroup = 'adjustments' | 'allowances';
type AnnualSchema = 'def1' | 'def2' | 'def3' | 'def4';
type AnnualField = {
  group: AnnualGroup;
  name: string;
  label: string;
  description: string;
  min?: number;
  max?: number;
  schemas: AnnualSchema[];
};
type AnnualSubmission = Record<string, unknown>;
type BuildingAllowanceName = 'structuredBuildingAllowance' | 'enhancedStructuredBuildingAllowance';
type BuildingAllowanceDraft = {
  amount: string;
  buildingName: string;
  buildingNumber: string;
  postcode: string;
  qualifyingDate: string;
  qualifyingAmountExpenditure: string;
};

const annualFields: AnnualField[] = [
  { group: 'adjustments', name: 'includedNonTaxableProfits', label: 'Non-taxable profits included in turnover', description: 'Income and profits included in business income or expenses that are not taxable as business profits.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'basisAdjustment', label: 'Basis period adjustment', description: 'Adjustment needed to align accounting profits with the tax year. Enter a negative amount if this reduces profit.', min: -99999999999.99, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'overlapReliefUsed', label: 'Overlap relief used', description: 'Overlap profits being relieved for this tax year.', min: 0, schemas: ['def1'] },
  { group: 'adjustments', name: 'averagingAdjustment', label: 'Averaging adjustment', description: 'For eligible farmers, market gardeners, and creators of literary or artistic works. HMRC marks this field as deprecated.', min: -99999999999.99, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'accountingAdjustment', label: 'Accounting adjustment', description: 'Adjustment for a change of accounting practice.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'outstandingBusinessIncome', label: 'Outstanding business income', description: 'Business income not included in another field.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'balancingChargeBpra', label: 'Balancing charge: business premises renovation', description: 'Balancing charge where Business Premises Renovation Allowance has been claimed.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'balancingChargeOther', label: 'Other balancing charges', description: 'Balancing charge where assets were disposed of for more than their tax value.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'goodsAndServicesOwnUse', label: 'Goods or services taken for personal use', description: 'Normal sale value of goods or stock taken out of the business.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'transitionProfitAmount', label: 'Transition profit amount', description: 'Transition profit arising in this tax year for this income source.', min: 0, schemas: ['def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'transitionProfitAccelerationAmount', label: 'Transition profit acceleration amount', description: 'Additional transition profit elected to be treated as arising in this tax year. Requires a transition profit amount.', min: 0, schemas: ['def2', 'def3', 'def4'] },
  { group: 'adjustments', name: 'adjustmentToProfitsForClass4', label: 'Adjustment to profits for Class 4 National Insurance', description: 'Total applicable adjustments to profit for Class 4 National Insurance purposes.', min: 0, schemas: ['def4'] },
  { group: 'allowances', name: 'tradingIncomeAllowance', label: 'Trading income allowance', description: 'Claim up to £1,000 instead of other allowances.', min: 0, max: 1000, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'annualInvestmentAllowance', label: 'Annual investment allowance', description: 'Annual investment allowance on qualifying plant and machinery.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'capitalAllowanceMainPool', label: 'Capital allowance: main pool', description: 'Capital allowances on equipment, including qualifying lower-emission cars.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'capitalAllowanceSpecialRatePool', label: 'Capital allowance: special rate pool', description: 'Capital allowances on equipment at the special rate.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'zeroEmissionsGoodsVehicleAllowance', label: 'Zero-emissions goods vehicle allowance', description: 'Allowance for qualifying zero-emissions goods vehicles.', min: 0, schemas: ['def1', 'def2'] },
  { group: 'allowances', name: 'businessPremisesRenovationAllowance', label: 'Business premises renovation allowance', description: 'Allowance for converting or renovating qualifying unused business premises.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'enhancedCapitalAllowance', label: 'Enhanced capital allowance', description: 'Other qualifying enhanced capital allowances.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'allowanceOnSales', label: 'Allowance on sale of assets', description: 'Allowance where assets are disposed of for less than their tax value.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'capitalAllowanceSingleAssetPool', label: 'Capital allowance: single asset pool', description: 'Capital allowances for single asset pools.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'electricChargePointAllowance', label: 'Electric charge-point allowance', description: 'Allowance for qualifying electric charge points.', min: 0, schemas: ['def1', 'def2'] },
  { group: 'allowances', name: 'zeroEmissionsCarAllowance', label: 'Zero-emissions car allowance', description: 'Allowance for qualifying zero-emissions cars.', min: 0, schemas: ['def1', 'def2', 'def3', 'def4'] },
  { group: 'allowances', name: 'firstYearAllowanceOnPlantAndMachinery', label: 'First-year allowance on plant and machinery (Sandbox test only)', description: 'Test-only first-year allowance for qualifying plant and machinery expenditure.', min: 0, schemas: ['def4'] },
];

function getAnnualSchema(taxYear: string): AnnualSchema {
  const startYear = Number(taxYear.slice(0, 4));
  if (startYear >= 2026) return 'def4';
  if (startYear === 2025) return 'def3';
  if (startYear === 2024) return 'def2';
  return 'def1';
}

function supportsBusinessDetailsChangedRecently(schema: AnnualSchema) {
  return schema !== 'def4';
}

function getAnnualFields(schema: AnnualSchema) {
  return annualFields.filter((field) => field.schemas.includes(schema));
}

const class4NicsExemptionReasons = [
  ['non-resident', 'Non-resident'],
  ['trustee', 'Trustee'],
  ['diver', 'Diver'],
  ['ITTOIA-2005', 'Exempt under ITTOIA 2005'],
  ['over-state-pension-age', 'Over State Pension age'],
  ['under-16', 'Under 16'],
] as const;
const hmrcBuildingTextPattern = /^[0-9a-zA-ZÀ-˿’{}\- _&`():.'^]{1,90}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getBuildingAllowanceDrafts(value: unknown): BuildingAllowanceDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const building = isRecord(entry.building) ? entry.building : {};
    const firstYear = isRecord(entry.firstYear) ? entry.firstYear : {};
    return [{
      amount: typeof entry.amount === 'number' ? String(entry.amount) : '',
      buildingName: typeof building.name === 'string' ? building.name : '',
      buildingNumber: typeof building.number === 'string' ? building.number : '',
      postcode: typeof building.postcode === 'string' ? building.postcode : '',
      qualifyingDate: typeof firstYear.qualifyingDate === 'string' ? firstYear.qualifyingDate : '',
      qualifyingAmountExpenditure: typeof firstYear.qualifyingAmountExpenditure === 'number'
        ? String(firstYear.qualifyingAmountExpenditure)
        : '',
    }];
  });
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
          min={field.min ?? 0}
          max={field.max}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="number-no-spinner w-full bg-transparent py-2 pl-2 text-right font-normal text-gray-900 outline-none"
        />
      </span>
      <span className="font-normal text-gray-500">{field.description}</span>
    </label>
  );
}

function BuildingAllowanceFields({
  name,
  label,
  drafts,
  onChange,
}: {
  name: BuildingAllowanceName;
  label: string;
  drafts: BuildingAllowanceDraft[];
  onChange: (name: BuildingAllowanceName, drafts: BuildingAllowanceDraft[]) => void;
}) {
  function updateDraft(index: number, key: keyof BuildingAllowanceDraft, value: string) {
    onChange(name, drafts.map((draft, draftIndex) => draftIndex === index ? { ...draft, [key]: value } : draft));
  }

  return (
    <fieldset className="rounded-lg border border-blue-200 bg-white/50 p-3">
      <legend className="px-2 font-semibold text-gray-800">{label}</legend>
      <div className="flex flex-col gap-4">
        {drafts.map((draft, index) => (
          <div key={`${name}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                Allowance amount (£)
                <input type="number" min="0" max="99999999999.99" step="0.01" value={draft.amount} onChange={(event) => updateDraft(index, 'amount', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                Building postcode (required)
                <input maxLength={90} value={draft.postcode} onChange={(event) => updateDraft(index, 'postcode', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                Building name
                <input maxLength={90} value={draft.buildingName} onChange={(event) => updateDraft(index, 'buildingName', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                Building number
                <input maxLength={90} value={draft.buildingNumber} onChange={(event) => updateDraft(index, 'buildingNumber', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-600">Enter at least a building name or number. First-year details are optional, but both qualifying date and expenditure are required when used.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                First-year qualifying date
                <input type="date" value={draft.qualifyingDate} onChange={(event) => updateDraft(index, 'qualifyingDate', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                Qualifying expenditure (£)
                <input type="number" min="0" max="99999999999.99" step="0.01" value={draft.qualifyingAmountExpenditure} onChange={(event) => updateDraft(index, 'qualifyingAmountExpenditure', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
              </label>
            </div>
            <button type="button" onClick={() => onChange(name, drafts.filter((_, draftIndex) => draftIndex !== index))} className="mt-3 text-sm font-semibold text-red-700 underline">
              Remove this building allowance
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(name, [...drafts, {
          amount: '',
          buildingName: '',
          buildingNumber: '',
          postcode: '',
          qualifyingDate: '',
          qualifyingAmountExpenditure: '',
        }])}
        className="mt-3 rounded-lg border border-blue-500 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
      >
        Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}

export default function AnnualSummary({ nino, businessId, startDate, endDate }: AnnualSummaryProps) {
  const validPeriod = Boolean(startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate));
  const taxYear = validPeriod ? getTaxYear(endDate!) : undefined;
  const annualSchema = taxYear ? getAnnualSchema(taxYear) : undefined;
  const [values, setValues] = useState<Record<string, string>>({});
  const [businessDetailsChangedRecently, setBusinessDetailsChangedRecently] = useState(false);
  const [class4NicsExemptionReason, setClass4NicsExemptionReason] = useState('');
  const [buildingAllowanceDrafts, setBuildingAllowanceDrafts] = useState<Record<BuildingAllowanceName, BuildingAllowanceDraft[]>>({
    structuredBuildingAllowance: [],
    enhancedStructuredBuildingAllowance: [],
  });
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
        for (const field of getAnnualFields(annualSchema!)) {
          const group = submission[field.group];
          if (isRecord(group) && typeof group[field.name] === 'number') nextValues[field.name] = String(group[field.name]);
        }
        const nonFinancials = isRecord(submission.nonFinancials) ? submission.nonFinancials : {};
        if (!cancelled) {
          setValues(nextValues);
          setBusinessDetailsChangedRecently(
            supportsBusinessDetailsChangedRecently(annualSchema!) && nonFinancials.businessDetailsChangedRecently === true,
          );
          setClass4NicsExemptionReason(typeof nonFinancials.class4NicsExemptionReason === 'string' ? nonFinancials.class4NicsExemptionReason : '');
          const allowances = isRecord(submission.allowances) ? submission.allowances : {};
          setBuildingAllowanceDrafts({
            structuredBuildingAllowance: getBuildingAllowanceDrafts(allowances.structuredBuildingAllowance),
            enhancedStructuredBuildingAllowance: getBuildingAllowanceDrafts(allowances.enhancedStructuredBuildingAllowance),
          });
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
  }, [nino, businessId, taxYear, annualSchema]);

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateBuildingAllowance(name: BuildingAllowanceName, drafts: BuildingAllowanceDraft[]) {
    setBuildingAllowanceDrafts((current) => ({ ...current, [name]: drafts }));
  }

  async function saveAnnualSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nino || !businessId || !taxYear || !annualSchema) return;
    setSaving(true);
    setMessage(undefined);

    const fields = getAnnualFields(annualSchema);
    const submission: AnnualSubmission = {};
    for (const groupName of ['adjustments', 'allowances'] as const) {
      const group: Record<string, unknown> = {};
      for (const field of fields.filter((item) => item.group === groupName)) {
        const enteredValue = values[field.name]?.trim();
        if (!enteredValue) {
          continue;
        }
        const amount = Number(enteredValue);
        if (
          !Number.isFinite(amount)
          || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
          || amount < (field.min ?? 0)
          || amount > (field.max ?? 99999999999.99)
        ) {
          const range = field.max === undefined
            ? `at least £${(field.min ?? 0).toLocaleString('en-GB')}`
            : `between £${(field.min ?? 0).toLocaleString('en-GB')} and £${field.max.toLocaleString('en-GB')}`;
          setMessage({ kind: 'error', text: `${field.label} must be a valid amount with up to two decimal places, ${range}.` });
          setSaving(false);
          return;
        }
        group[field.name] = amount;
      }
      if (Object.keys(group).length > 0) submission[groupName] = group;
    }

    const transitionProfitAccelerationAmount = values.transitionProfitAccelerationAmount?.trim();
    if (transitionProfitAccelerationAmount && !values.transitionProfitAmount?.trim()) {
      setMessage({ kind: 'error', text: 'Enter the transition profit amount before submitting a transition profit acceleration amount.' });
      setSaving(false);
      return;
    }

    const tradingIncomeAllowance = values.tradingIncomeAllowance?.trim();
    const hasOtherAllowance = fields.some((field) =>
      field.group === 'allowances'
      && field.name !== 'tradingIncomeAllowance'
      && Boolean(values[field.name]?.trim()),
    ) || [...buildingAllowanceDrafts.structuredBuildingAllowance, ...buildingAllowanceDrafts.enhancedStructuredBuildingAllowance]
      .some((draft) => Object.values(draft).some((value) => value.trim()));
    if (tradingIncomeAllowance && hasOtherAllowance) {
      setMessage({ kind: 'error', text: 'HMRC does not allow the trading income allowance to be submitted with any other allowances.' });
      setSaving(false);
      return;
    }

    const allowances = (submission.allowances as Record<string, unknown> | undefined) ?? {};
    for (const allowanceName of ['structuredBuildingAllowance', 'enhancedStructuredBuildingAllowance'] as const) {
      const entries: AnnualSubmission[] = [];
      for (const [index, draft] of buildingAllowanceDrafts[allowanceName].entries()) {
        const hasAnyValue = Object.values(draft).some((value) => value.trim());
        if (!hasAnyValue) continue;
        const amount = Number(draft.amount);
        if (
          !draft.amount.trim()
          || !Number.isFinite(amount)
          || amount < 0
          || amount > 99999999999.99
          || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
        ) {
          setMessage({ kind: 'error', text: `${allowanceName === 'structuredBuildingAllowance' ? 'Structured building allowance' : 'Enhanced structured building allowance'} ${index + 1} must have a valid amount with up to two decimal places.` });
          setSaving(false);
          return;
        }
        if (!draft.postcode.trim() || (!draft.buildingName.trim() && !draft.buildingNumber.trim())) {
          setMessage({ kind: 'error', text: `${allowanceName === 'structuredBuildingAllowance' ? 'Structured building allowance' : 'Enhanced structured building allowance'} ${index + 1} must include a postcode and a building name or number.` });
          setSaving(false);
          return;
        }
        if ([draft.postcode, draft.buildingName, draft.buildingNumber].some((value) => {
          const trimmedValue = value.trim();
          return trimmedValue && !hmrcBuildingTextPattern.test(trimmedValue);
        })) {
          setMessage({ kind: 'error', text: `Building names, numbers, and postcodes must use HMRC's allowed characters and be no longer than 90 characters.` });
          setSaving(false);
          return;
        }
        const hasQualifyingDate = Boolean(draft.qualifyingDate.trim());
        const hasQualifyingExpenditure = Boolean(draft.qualifyingAmountExpenditure.trim());
        if (hasQualifyingDate !== hasQualifyingExpenditure) {
          setMessage({ kind: 'error', text: `Enter both first-year qualifying date and expenditure for ${allowanceName === 'structuredBuildingAllowance' ? 'structured building allowance' : 'enhanced structured building allowance'} ${index + 1}, or leave both blank.` });
          setSaving(false);
          return;
        }
        if (hasQualifyingDate && !isValidIsoDate(draft.qualifyingDate)) {
          setMessage({ kind: 'error', text: `Enter a valid first-year qualifying date for ${allowanceName === 'structuredBuildingAllowance' ? 'structured building allowance' : 'enhanced structured building allowance'} ${index + 1}.` });
          setSaving(false);
          return;
        }

        const entry: AnnualSubmission = {
          amount,
          building: {
            ...(draft.buildingName.trim() && { name: draft.buildingName.trim() }),
            ...(draft.buildingNumber.trim() && { number: draft.buildingNumber.trim() }),
            postcode: draft.postcode.trim(),
          },
        };
        if (hasQualifyingDate && hasQualifyingExpenditure) {
          const qualifyingAmountExpenditure = Number(draft.qualifyingAmountExpenditure);
          if (
            !Number.isFinite(qualifyingAmountExpenditure)
            || qualifyingAmountExpenditure < 0
            || qualifyingAmountExpenditure > 99999999999.99
            || Math.abs(qualifyingAmountExpenditure * 100 - Math.round(qualifyingAmountExpenditure * 100)) > 0.000001
          ) {
            setMessage({ kind: 'error', text: `Qualifying expenditure for ${allowanceName === 'structuredBuildingAllowance' ? 'structured building allowance' : 'enhanced structured building allowance'} ${index + 1} must be a valid amount with up to two decimal places.` });
            setSaving(false);
            return;
          }
          entry.firstYear = {
            qualifyingDate: draft.qualifyingDate,
            qualifyingAmountExpenditure,
          };
        }
        entries.push(entry);
      }
      if (entries.length > 0) allowances[allowanceName] = entries;
    }
    if (Object.keys(allowances).length > 0) submission.allowances = allowances;

    const nonFinancials: Record<string, unknown> = {};
    if (supportsBusinessDetailsChangedRecently(annualSchema)) {
      nonFinancials.businessDetailsChangedRecently = businessDetailsChangedRecently;
    }
    if (class4NicsExemptionReason) nonFinancials.class4NicsExemptionReason = class4NicsExemptionReason;
    if (Object.keys(nonFinancials).length > 0) submission.nonFinancials = nonFinancials;

    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/userRestrictedAuth/annualSubmission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', clientData, nino, businessId, taxYear, annualSubmission: submission }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'HMRC could not save the annual summary.');
      setMessage({ kind: 'success', text: 'The self-employment annual summary was saved with HMRC.' });
    } catch (saveError) {
      setMessage({ kind: 'error', text: saveError instanceof Error ? saveError.message : 'The annual summary could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  if (!validPeriod || !nino || !businessId || !annualSchema) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 p-4 shadow-md">
        <p className="text-center text-gray-700">This tax return link is missing a valid business or tax year. Open it from the year-end obligations list.</p>
      </div>
    );
  }

  const fields = getAnnualFields(annualSchema);
  const adjustmentFields = fields.filter((field) => field.group === 'adjustments');
  const allowanceFields = fields.filter((field) => field.group === 'allowances');

  return (
    <>
      <div className="mt-6 rounded-2xl border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 p-4 shadow-2xl">
        <div className="mb-5 border-b border-sky-100 pb-4">
          <h2 className="text-center text-2xl font-extrabold">Self-Employment Annual Summary</h2>
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
            <div className="mt-5 flex flex-col gap-4">
              <BuildingAllowanceFields
                name="structuredBuildingAllowance"
                label="Structured building allowance"
                drafts={buildingAllowanceDrafts.structuredBuildingAllowance}
                onChange={updateBuildingAllowance}
              />
              <BuildingAllowanceFields
                name="enhancedStructuredBuildingAllowance"
                label="Enhanced structured building allowance"
                drafts={buildingAllowanceDrafts.enhancedStructuredBuildingAllowance}
                onChange={updateBuildingAllowance}
              />
            </div>
            {Number(values.tradingIncomeAllowance) > 0 && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                HMRC does not allow the trading income allowance to be submitted with any other annual allowance. Remove other allowance claims before saving it.
              </p>
            )}
          </fieldset>

          <fieldset className="rounded-lg border border-blue-300 bg-white/60 p-4">
            <legend className="px-2 text-xl font-bold text-gray-900">Business information</legend>
            {supportsBusinessDetailsChangedRecently(annualSchema) && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={businessDetailsChangedRecently} onChange={(event) => setBusinessDetailsChangedRecently(event.target.checked)} className="mt-1" />
                Business details changed recently
              </label>
            )}
            <label htmlFor="class4-reason" className="mt-4 flex max-w-xl flex-col gap-1 text-sm font-semibold text-gray-700">
              Class 4 National Insurance exemption reason
              <select id="class4-reason" value={class4NicsExemptionReason} onChange={(event) => setClass4NicsExemptionReason(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal">
                <option value="">No exemption reason</option>
                {class4NicsExemptionReasons.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
          </fieldset>

          <div className="rounded-lg border border-sky-200 bg-white/70 p-4 text-sm text-gray-700">
            <h3 className="font-bold text-gray-900">Before finalising</h3>
            <p className="mt-1">HMRC requires all income sources and any other claims or reliefs to be submitted before a final tax calculation and declaration. This page submits the self-employment annual summary only.</p>
          </div>

          {message && <p role="status" className={message.kind === 'success' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{message.text}</p>}

          <button type="submit" disabled={saving} className="w-fit self-center rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-4 py-2 font-semibold text-white shadow-sm hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Annual Summary With HMRC'}
          </button>
          </form>
        )}
      </div>
      {!loading && taxYear && nino && (
        <>
        {businessId && (
          <SelfAssessmentTaxCalculations
            nino={nino}
            businessId={businessId}
            taxYear={taxYear}
          />
        )}
        <IndividualTaxCalculation
          nino={nino}
          taxYear={taxYear}
          calculationType="intent-to-finalise"
        />
        </>
      )}
    </>
  );
}