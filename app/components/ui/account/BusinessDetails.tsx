'use client';

import { useEffect, useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';
import type { BusinessDetails as BusinessDetailsData } from '@/lib/types/hmrc';

type BusinessDetailsProps = {
  businessId: string | string[] | undefined;
  nino: string | string[] | undefined;
};

type BusinessDetailsErrorPayload = {
  error?: unknown;
  message?: unknown;
  errors?: unknown;
  body?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorMessage(payload: unknown, status: number) {
  const errorPayload: BusinessDetailsErrorPayload = isRecord(payload) ? payload : {};
  const nestedBody = isRecord(errorPayload.body) ? errorPayload.body : undefined;
  const hmrcError = nestedBody ?? errorPayload;
  const messages: string[] = [];

  if (typeof hmrcError.message === 'string') messages.push(hmrcError.message);
  else if (typeof hmrcError.error === 'string') messages.push(hmrcError.error);

  if (Array.isArray(hmrcError.errors)) {
    for (const detail of hmrcError.errors) {
      if (isRecord(detail) && typeof detail.message === 'string' && !messages.includes(detail.message)) {
        messages.push(detail.message);
      }
    }
  }

  if (messages.length > 0) return messages.join(' ');

  if (typeof payload === 'string' && payload.trim() && payload.length <= 300 && !/^\s*</.test(payload)) {
    return payload;
  }

  if (status === 401 || status === 403) {
    return 'HMRC could not authorise this request. Reconnect your HMRC account and try again.';
  }
  if (status === 404) return 'HMRC could not find details for this business.';
  if (status === 429) return 'HMRC is receiving too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'HMRC is temporarily unavailable. Please try again later.';
  if (status === 400) return 'HMRC could not process the request. Check the business details and try again.';
  return 'Business details could not be retrieved. Please check the business and try again.';
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[minmax(9rem,auto)_1fr] gap-x-4">
      <dt className="font-semibold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatQuarterlyPeriodType(periodType?: string) {
  if (!periodType) return undefined;

  return periodType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function BusinessDetails({ businessId, nino }: BusinessDetailsProps) {
  const [businessDetails, setBusinessDetails] = useState<BusinessDetailsData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const selectedBusinessId = Array.isArray(businessId) ? businessId[0] : businessId;
  const selectedNino = Array.isArray(nino) ? nino[0] : nino;

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      setBusinessDetails(undefined);
      setError(undefined);
      setLoading(true);

      try {
        const clientData = await buildClientPayload();
        const response = await fetch('/api/hmrc/userRestrictedAuth/businessDetails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nino: selectedNino,
            businessID: selectedBusinessId,
            clientData,
          }),
        });
        const responseText = await response.text();
        let responseBody: unknown = responseText;
        try {
          responseBody = responseText ? JSON.parse(responseText) : undefined;
        } catch {
          // HMRC can return a non-JSON body; retain its text for the user-facing error.
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(responseBody, response.status));
        }
        if (!isRecord(responseBody) || typeof responseBody.businessId !== 'string') {
          throw new Error('HMRC returned business details in an unexpected format. Please try again later.');
        }
        if (!cancelled) setBusinessDetails(responseBody as BusinessDetailsData);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error
            ? loadError.message
            : 'Business details could not be retrieved. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedBusinessId, selectedNino]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-blue-400 p-4 shadow-md">
        <p className="text-center text-gray-700" role="status">Loading business details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-4 shadow-md" role="alert">
        <h3 className="text-center text-lg font-bold text-red-900">Business details could not be loaded</h3>
        <p className="mt-2 text-center text-red-800">{error}</p>
      </div>
    );
  }

  if (!businessDetails) {
    return (
      <div className="border-2 border-blue-400 shadow-md rounded-2xl p-4 mt-6">
        <p className="text-lg text-center">
          No business details found. Please ensure your National Insurance number is entered on your account page.
        </p>
      </div>
    );
  }

  const address = [
    businessDetails.businessAddressLineOne,
    businessDetails.businessAddressLineTwo,
    businessDetails.businessAddressLineThree,
    businessDetails.businessAddressLineFour,
    businessDetails.businessAddressPostcode,
    businessDetails.businessAddressCountryCode,
  ].filter(Boolean);

  return (
    <>
    <div className="border-2 border-blue-400 shadow-2xl bg-linear-to-tr from-gray-200 to-40% to-gray-50 rounded-2xl p-4 mt-6 flex flex-col justify-self-start w-7/8">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="font-extrabold text-2xl text-center flex-1">Business Details</h3>
        <button
          type="button"
          className="rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-2 py-2 text-sm text-center font-medium text-white shadow-xs hover:to-blue-500 hover:scale-105 hover:shadow-2xl text-nowrap"
          onClick={() => setShowMore((current) => !current)}
        >
          {showMore ? 'Show Less' : 'Show More'}
        </button>
      </div>

      <dl className="space-y-2">
        <DetailRow label="Business ID" value={businessDetails.businessId} />
        <DetailRow label="Trading name" value={businessDetails.tradingName} />
        <DetailRow label="Business type" value={businessDetails.typeOfBusiness} />
        <DetailRow label="Trade type" value={businessDetails.tradingType} />
        <DetailRow label="Commenced" value={businessDetails.commencementDate} />

        {showMore && (
          <>
            <DetailRow label="Ceased" value={businessDetails.cessationDate} />
            <DetailRow
              label="Quarterly reporting period"
              value={formatQuarterlyPeriodType(businessDetails.quarterlyTypeChoice?.quarterlyPeriodType)}
            />
            <DetailRow
              label="Quarterly period choice tax year"
              value={businessDetails.quarterlyTypeChoice?.taxYearOfChoice}
            />
          </>
        )}
      </dl>
    </div>
    {address.length > 0 && (
    <div className="border-2 border-blue-400 shadow-2xl bg-linear-to-tr from-gray-200 to-40% to-gray-50 rounded-2xl p-4 mt-6 flex flex-col justify-self-start">
      <div className="flex flex-col items-center justify-between gap-4 mb-2">
        <h3 className="font-extrabold text-2xl text-center">Business Address</h3>
          <address className="not-italic w-full">
            {address.map((line, index) => <p className="text-gray-700 text-right" key={`${line}-${index}`}>{line}</p>)}
          </address>
        </div>

    </div>
     )}
    </>
  );
}
