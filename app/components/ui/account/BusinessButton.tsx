"use client";
import { useState } from 'react';
import { HMRC_CONFIG } from '@/config/hmrc';

export default function BusinessDetails(props: any) {
  const { business, nino } = props;

  async function onClickHandler(){
    await fetch(`${HMRC_CONFIG.testApiUrl}/individuals/business/details/${nino}/${business.businessId}`, {
      'method': 'GET'
    }
    )
  }

  return (
    <button onClick={onClickHandler}>
      <div className="flex flex-col justify-center items-center gap-2 bg-gray-100 rounded-4xl p-6 text-[14px] text-gray-700 w-full border-2 border-gray-500 shadow-2xl">
        <div className="flex items-center">
          <label className="font-bold">Business ID:</label>
          <input disabled className="font-light" value={business.businessId}></input>
        </div>
        <div className="flex items-center">
          <label className="font-bold">Business Name:</label>
          <input disabled className="font-light" value={business.tradingName}></input>
        </div>
        <div className="flex items-center">
          <label className="font-bold">Business Type:</label>
          <input disabled className="font-light" value={business.tradingType}></input>
        </div>
      </div>
    </button>
  );
}