"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import HMRCButton from './auth/hmrcAccountLinkButton';
import React, { useState, useEffect } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';
import BusinessButton from './ui/account/BusinessButton';

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

export default function Profile({ hmrcConnected }: { hmrcConnected: boolean }) {
  const [ shown, setShown ] = useState(false);
  const [ entered, setEntered ] = useState(false);
  const [ nino, setNino ] = useState("");
  const [ businessList, setBusinessList ] = useState<any>(null);
  const { user, isLoading } = useUser();
  const connected = hmrcConnected;

  function touchHandler(){
    setShown(true);
    setTimeout(()=>{
      setShown(false);
    }, 3000);
  }

  async function NIHandler(nextNino: string){
    const regex = /^[A-Z]{2}\d{6}[A-Z]$/;
    if (!regex.test(nextNino)) {
      return;
    }

    const saveResponse = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nino: nextNino }),
    });
    if (!saveResponse.ok) {
      console.error('Unable to save the National Insurance number', await saveResponse.text());
      return;
    }
    setEntered(true);

    const clientData = await buildClientPayload();
    const businessResponse = await fetch('/api/hmrc/userRestrictedAuth/businessList', {
      method: 'POST',
      body: JSON.stringify({ clientData, nino: nextNino })
    });
    const businessData = await businessResponse.json();
    if(businessResponse.ok){
      setBusinessList(businessData);
    }
  }

  useEffect(() => {
    if (!user?.sub) {
      return;
    }

    async function checkForNino(){
      try {
        const response = await fetch('/api/db', {
          method: 'GET'
        });
        if (!response.ok) {
          throw new Error(`Account lookup failed with status ${response.status}`);
        }
        const userDetails = await response.json();
        const nextNino = userDetails?.ni_number ?? "";

        setNino(nextNino);
        setEntered(Boolean(nextNino));

        if (nextNino) {
          await NIHandler(nextNino);
        }
      } catch (error) {
        console.error('Unable to load account details', error);
      }
    }

    async function addCookiesPreferences(){
      try{
        const cookiesResponse = await fetch('/api/cookies', {
          method: 'GET'
        });
        if (!cookiesResponse.ok) {
          throw new Error(`Cookie preferences lookup failed with status ${cookiesResponse.status}`);
        }
        return cookiesResponse;
      } catch(error){
        console.error('Unable to load cookie preferences', error);
      }
    }

    checkForNino();
    addCookiesPreferences();
  }, [user]);

  if (isLoading) return <p className="text-xs text-gray-500">Loading...</p>;
  if (!user) return null;
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full max-w-xl flex-col justify-center items-center gap-2 bg-linear-to-tr from-gray-200 to-40% to-gray-50 rounded-4xl p-4 text-[14px] text-gray-700 border-2 border-blue-500 shadow-2xl">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold text-black sm:text-3xl">Your Details</h2>
      <div className="flex items-center justify-center gap-2 text-green-700 text-[13px] font-medium fadeOut">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        Successfully authenticated
      </div>
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-3 sm:flex-row">
          <div className="flex items-center">
            { user.picture?
              <img width="160" height="160" loading="eager" src={user.picture} className="h-24 w-24 rounded-full sm:h-40 sm:w-40" alt="User avatar" />
              :
              <span className="h-24 w-24 sm:h-40 sm:w-40 bg-linear-to-b from-[#2d2d42] to-[#161620] rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {getInitials(user.name, user.email)}
              </span>
            }
          </div>

          <div className="flex w-full min-w-0 flex-col items-center gap-1">

            <div className="flex min-w-0 items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-gray-100 border border-gray-500 rounded-full py-1.5 pl-1.5 pr-4 text-[14px] text-gray-700 w-full">
              <span className="w-7 h-7 bg-linear-to-b from-[#2d2d42] to-[#161620] rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {getInitials(user.name, user.email)}
              </span>
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-gray-100 border border-gray-500 rounded-full px-4 py-2 text-[14px] text-gray-700 w-full">
              <span className="truncate font-bold">{user.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-gray-100 border border-gray-500 rounded-2xl py-1.5 pr-1.5 pl-4 text-[14px] text-gray-700 w-full">
              <span className="font-semibold">HMRC Account Connected?</span>
              {
                connected ?
                <span className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                :
                <>
                  <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M 1 1 L 9 9 M 1 9 L 9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <HMRCButton />
                </>
              }
            </div>
            {
              connected &&
              <div className="relative flex w-full flex-wrap items-center gap-2 rounded-2xl border border-gray-500 bg-linear-to-tr from-gray-300 via-gray-300 to-gray-100 py-1.5 pr-1.5 pl-4 text-[14px] text-gray-700">
                <span className="truncate font-semibold" title="National Insurance number">N.I. Number</span>
                <input id="nino" name="nino" className="min-w-0 w-28 bg-white/90 rounded-lg pl-3 font-light" disabled={entered} placeholder="AA000000A" value={nino} onChange={e=>setNino(e.target.value)} />
                <button
                  className="w-7 h-7 bg-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  onClick={() => NIHandler(nino)}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="w-6 h-6 bg-linear-to-tr from-gray-600/50 to-gray-400/50 hover:from-gray-600/70 hover:to-gray-400/70 to-80% rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 hover:cursor-pointer" onTouchStart={touchHandler} onClick={touchHandler}>
                  <svg width="12" height="12" viewBox="0 0 10 9.5" fill="none">
                    <path d="M 3.578 2.51 C 3.607 1.573 4.298 0.982 5.206 1.011 C 7.165 1.026 7.367 3.59 6 4 C 4.759 4.44 5 5 4.975 5.866" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="5.019" cy="8" r="0.25" stroke="white" fill="white" strokeWidth="1" />
                  </svg>
                </span>
                {
                  shown &&
                  <span className="absolute top-full z-10 max-w-full rounded-xl bg-gray-200 p-3 text-xs text-gray-900 shadow-lg">
                    Enter your National Insurance number in the format 'AA000000A'.
                  </span>
                }
                </div>
              }
          </div>
        </div>
      </div>
      { businessList && 
        <div className="w-full max-w-xl min-w-0 border-2 border-blue-500 rounded-4xl p-3 shadow-2xl bg-linear-to-tr from-gray-200 to-40% to-gray-50">
          <h2 className="text-2xl font-bold ml-2 mt-2 sm:text-3xl">Your Business{businessList.listOfBusinesses.length > 1 ? 'es' : ''}</h2>
          <div className="flex flex-col justify-center items-center gap-3 rounded-4xl p-2 sm:p-5 text-[14px] text-gray-700 max-w-full">
            { businessList.listOfBusinesses.map((business: any, i: number) => {
              return (
                <BusinessButton business={business} key={i} nino={nino} />
              )
            })
            }
          </div>
        </div>
      }
    </div>
  );
}