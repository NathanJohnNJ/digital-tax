'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildClientPayload } from '@/client/fraud/clientData';
import type { QuarterlyObligations } from '@/lib/types/hmrc';
import { formatDisplayDate } from '@/app/api/utils/ukTaxYear';

type QuarterlyProps = {
  businessId: string
  nino: string
  year: string
}

export default function Quarterly(props: QuarterlyProps){
  const { businessId, nino, year } = props;
  const searchParams = useSearchParams();
  const [ quarterlyObligations, setQuarterlyObligations ] = useState<QuarterlyObligations>();
  const quarterlyUpdatesHref = searchParams.toString()
    ? `/account/quarterly?${searchParams.toString()}`
    : '/account/quarterly';

  useEffect(() => {
    setQuarterlyObligations(undefined);

    async function getQuarterlyObligations(){
      const clientData = await buildClientPayload();
      const req = await fetch(`/api/hmrc/userRestrictedAuth/obligations/quarterly`, {
        method: 'POST',
        body: JSON.stringify({
          nino: nino,
          businessId: businessId,
          clientData: clientData,
          taxYear: year
        })
      })
      if (!req.ok) {
        return undefined;
      }
      
      return await req.json() as QuarterlyObligations;
    }
    async function getObligations(){
      const obs = await getQuarterlyObligations();
      if (obs) {
        setQuarterlyObligations(obs);
      }
    }
    getObligations();
  }, [year])

  return(
    <div className="">
      { quarterlyObligations &&
        <div className="p-2 m-4 flex flex-col">
          {quarterlyObligations.obligations.flatMap((business) => business.obligationDetails).map((obligation) => (
            <div key={`${obligation.periodStartDate}-${obligation.periodEndDate}`} className="flex items-center justify-between gap-3 border-b border-sky-100 py-4">
              <div className="mr-4">
                <h5 className="font-semibold">
                  {formatDisplayDate(obligation.periodStartDate)} to {formatDisplayDate(obligation.periodEndDate)}
                </h5>
                <p className="text-sm text-gray-600">Due {formatDisplayDate(obligation.dueDate)}</p>
              </div>
              {obligation.status === 'fulfilled' ? (
                <p className="font-extrabold text-green-700 px-2 text-right">
                  Fulfilled{obligation.receivedDate && ` on ${formatDisplayDate(obligation.receivedDate)}`}
                </p>
              ) : obligation.status === 'open' ? (
                <Link href={{
                  pathname: quarterlyUpdatesHref,
                  query: {
                    nino: nino,
                    businessId: businessId,
                    startDate: obligation.periodStartDate,
                    endDate: obligation.periodEndDate
                  }
                }} className="rounded-lg bg-linear-sky-600 px-2 py-2 text-sm text-center font-medium text-white bg-linear-to-tr from-blue-700 to-blue-400 hover:to-blue-500 hover:scale-105 shadow-xs hover:shadow-2xl text-nowrap">
                  Go To Quarterly updates
                </Link>
              ) : (
                <p className="font-medium capitalize">{obligation.status}</p>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  )
}