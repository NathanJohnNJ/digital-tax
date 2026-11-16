'use client';
import { useState, useEffect } from "react";
import Link from 'next/link';
import { buildClientPayload } from '@/client/fraud/clientData';
import type { Obligations } from '@/lib/types/hmrc';
import { formatDisplayDate } from '@/app/api/utils/ukTaxYear';

export default function YearEnd(props: any){
  const { businessId, nino, year } = props;
  const [ yearEndObligations, setYearEndObligations ] = useState<Obligations>();
  const [ error, setError ] = useState<string>();

useEffect(()=>{
  let active = true;
  setYearEndObligations(undefined);
  setError(undefined);

  async function getYearEndObligations(){
    try {
      const clientData = await buildClientPayload();
      if (!active) return;
      const req = await fetch(`/api/hmrc/userRestrictedAuth/obligations/yearEnd`, {
        method: 'POST',
        body: JSON.stringify({
          nino: nino,
          clientData: clientData,
          taxYear: year
        })
      });
      if (!req.ok) {
        if (active) setError('Unable to load year-end obligations. Please try again.');
        return;
      }
      const obligations = await req.json() as Obligations;
      if (active) setYearEndObligations(obligations);
    } catch (error) {
      if (active) {
        console.error('Unable to load year-end obligations', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
        setError('Unable to load year-end obligations. Please try again.');
      }
    }
  }
  getYearEndObligations();
  return () => { active = false; };
}, [year, nino])
  
  return (
    <div className="">
      {error && <p role="alert">{error}</p>}
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
