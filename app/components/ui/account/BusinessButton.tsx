"use client";
import Link from 'next/link';

export default function BusinessButton(props: any) {
  const { business, nino } = props;

  return (
    <div className="flex w-full max-w-sm items-center rounded-4xl border-2 border-gray-500 bg-gray-100">
      <div className="w-full min-w-0 px-3 py-3 text-[14px] text-gray-700 sm:px-6">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center">
            <label className="w-15 shrink-0 font-bold text-left">Name:</label>
            <input disabled className="min-w-0 flex-1 text-right rounded-lg border border-gray-300 bg-white px-2" value={business.tradingName}></input>
          </div>
          <div className="flex min-w-0 items-center">
            <label className="w-15 shrink-0 font-bold text-left">ID:</label>
            <input disabled className="min-w-0 flex-1 text-right rounded-lg border border-gray-300 bg-white px-2" value={business.businessId}></input>
          </div>
          <div className="flex min-w-0 items-center">
            <label className="w-15 shrink-0 font-bold text-left">Type:</label>
            <input disabled className="min-w-0 flex-1 text-right rounded-lg border border-gray-300 bg-white px-2" value={business.tradingType}></input>
          </div>
        
        <Link href={{
          pathname: '/account/business-overview',
          query: {
            nino: nino,
            businessName: business.tradingName,
            businessId: business.businessId
          }
          }} className="cursor-pointer rounded-lg bg-linear-sky-600 px-2 py-2 mt-2 text-sm text-center font-medium text-white bg-linear-to-tr from-blue-700 to-blue-400 hover:to-blue-500 hover:scale-105 shadow-xs hover:shadow-2xl text-nowrap">
          Go To Business Overview
        </Link>
        </div>
      </div>
    </div>
  );
}