"use client";
import Link from 'next/link';

export default function BusinessButton(props: any) {
  const { business, nino } = props;

  return (
    <div className="flex items-center border-2 border-gray-500 bg-gray-100 rounded-4xl">
      <div className="flex justify-center items-center gap-2 px-6 py-3 text-[14px] text-gray-700 w-min">
        <div className="flex flex-col gap-1">
          <div className="flex items-center w-65">
            <label className=" font-bold text-left w-15">Name:</label>
            <input disabled className=" text-right w-50 rounded-lg border border-gray-300 bg-white px-2" value={business.tradingName}></input>
          </div>
          <div className="flex items-center w-65">
            <label className="block font-bold text-left w-15">ID:</label>
            <input disabled className="inline text-right w-50 rounded-lg border border-gray-300 bg-white px-2" value={business.businessId}></input>
          </div>
          <div className="flex items-center w-65">
            <label className="inline font-bold text-left w-15">Type:</label>
            <input disabled className="inline text-right w-50 rounded-lg border border-gray-300 bg-white px-2" value={business.tradingType}></input>
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