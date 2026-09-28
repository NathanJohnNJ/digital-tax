'use client';
import { useState, useEffect } from "react";
import Link from 'next/link';
import { buildClientPayload } from '@/client/fraud/clientData';
import type { Obligations } from '@/lib/types/hmrc';
import { formatDisplayDate } from '@/app/api/utils/ukTaxYear';

export default function YearEnd(props: any){
  const { businessId, nino, year } = props;
  const [ yearEndObligations, setYearEndObligations ] = useState<Obligations>();

useEffect(()=>{
  setYearEndObligations(undefined);

  async function getYearEndObligations(){
    const clientData = await buildClientPayload();
    const req = await fetch(`/api/hmrc/userRestrictedAuth/obligations/yearEnd`, {
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

    return await req.json() as Obligations;
  }
  async function getObligations(){
    const obs = await getYearEndObligations();
    if (obs) {
      setYearEndObligations(obs);
    }
  }
  getObligations();
}, [year])
  
  return (
    <div className="">
      { yearEndObligations &&
        <div className="p-2 m-4 flex flex-col">
          {yearEndObligations.obligations.map((obligation) => (
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
                  pathname: '/account/taxReturn',
                  query: {
                    nino,
                    businessId,
                    startDate: obligation.periodStartDate,
                    endDate: obligation.periodEndDate,
                  },
                }} className="rounded-lg bg-linear-sky-600 px-2 py-2 text-sm text-center font-medium text-white bg-linear-to-tr from-blue-700 to-blue-400 hover:to-blue-500 hover:scale-105 shadow-xs hover:shadow-2xl text-nowrap">
                  Go To Year End Tax Return
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
