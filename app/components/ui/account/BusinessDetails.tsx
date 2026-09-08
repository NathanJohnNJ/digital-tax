'use client';

import { useEffect, useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';
import type { BusinessDetails as BusinessDetailsData } from '@/lib/types/hmrc';

type BusinessDetailsProps = {
  businessId: string | string[] | undefined;
  nino: string | string[] | undefined;
};

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
  const [showMore, setShowMore] = useState(false);
  const selectedBusinessId = Array.isArray(businessId) ? businessId[0] : businessId;
  const selectedNino = Array.isArray(nino) ? nino[0] : nino;

  useEffect(() => {
    async function getDetails(clientData: unknown) {
      const request = await fetch('/api/hmrc/userRestrictedAuth/businessDetails', {
        method: 'POST',
        body: JSON.stringify({
          nino: selectedNino,
          businessID: selectedBusinessId,
          clientData,
        }),
      });

      if (!request.ok) return undefined;
      return request.json() as Promise<BusinessDetailsData>;
    }

    async function loadDetails() {
      const clientData = await buildClientPayload();
      setBusinessDetails(await getDetails(clientData));
    }

    loadDetails();
  }, [selectedBusinessId, selectedNino]);

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
    <div className="border-2 border-blue-400 shadow-md rounded-2xl p-4 mt-6 flex flex-col justify-self-start w-7/8">
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

      {address.length > 0 && (
        <div className="mt-4 border-t border-sky-100 pt-4">
          <h4 className="text-2xl font-bold mb-2">Business Address</h4>
          <address className="not-italic space-y-1">
            {address.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          </address>
        </div>
      )}
    </div>
  );
}
