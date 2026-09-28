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

export default function Profile(props: React.ComponentProps<any>) {
  const [ shown, setShown ] = useState(false);
  const [ entered, setEntered ] = useState(false);
  const [ nino, setNino ] = useState("");
  const [ businessList, setBusinessList ] = useState<any>(null);
  const { user, isLoading } = useUser();
  const { accessToken } = props;
  const connected = accessToken ? true : false;

  function touchHandler(){
    setShown(true);
    setTimeout(()=>{
      setShown(false);
    }, 3000);
  }

  async function NIHandler(nextNino: string, authSub?: string){
    const regex = /^[A-Z]{2}\d{6}[A-Z]$/;
    if (!authSub || !regex.test(nextNino)) {
      return;
    }

    setEntered(true);
    await fetch('/api/db', {
      method: 'POST',
      body: JSON.stringify({
        nino: nextNino,
        sub: authSub
      })
    });

    const clientData = await buildClientPayload();
    const businessResponse = await fetch('/api/hmrc/userRestrictedAuth/businessList', {
      method: 'POST',
      body: JSON.stringify({ clientData, nino: nextNino })
    });
    const businessData = await businessResponse.json();
    if(businessResponse.ok){
      setBusinessList(businessData);
    }
    console.log(businessData);
  }

  useEffect(() => {
    const authSub = user?.sub;
    if (!authSub) {
      return;
    }

    async function checkForNino(){
      try {
        const response = await fetch(`/api/db?id=${authSub}`, {
          method: 'GET'
        });
        const userDetails = await response.json();
        const nextNino = userDetails?.ni_number ?? "";

        setNino(nextNino);
        setEntered(Boolean(nextNino));

        if (nextNino) {
          await NIHandler(nextNino, authSub);
        }
      } catch (error) {
        console.log(error);
      }
    }

    async function addCookiesPreferences(){
      try{
        const cookiesResponse = await fetch(`/api/cookies?id=${authSub}`, {
          method: 'GET'
        });
        return cookiesResponse;
      } catch(error){
        console.log(error);
      }
    }

    checkForNino();
    addCookiesPreferences();
  }, [user]);

  if (isLoading) return <p className="text-xs text-gray-500">Loading...</p>;
  if (!user) return null;
  return (
    <div className="flex">
      <div className="flex flex-col justify-center items-center gap-2 bg-linear-to-tr from-gray-200 to-40% to-gray-50 rounded-4xl m-6 p-4 text-[14px] text-gray-700 max-w-full h-min border-2 border-blue-500 shadow-2xl">
        <div className="flex items-center justify-between w-full h-min">
          <h2 className="text-3xl font-bold self-start ml-4 mb-2 text-black">Your Details</h2>
      <div className="flex items-center justify-center gap-2 text-green-500 text-[13px] font-medium fadeOut mr-4">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        Successfully authenticated
      </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center">
            <img width="160" height="160" loading="eager" src={user.picture} className="min-h-40 min-w-40 -ml-2" alt="User avatar" />
          </div>

          <div className="flex flex-col gap-0.5 justify-content-between items-center">

            <div className="flex items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-grey-100 border border-gray-500 rounded-full py-1.5 pl-1.5 pr-4 text-[14px] ml-2 text-gray-700 w-full">
              <span className="w-7 h-7 bg-linear-to-b from-[#2d2d42] to-[#161620] rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {getInitials(user.name, user.email)}
              </span>
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-grey-100 border border-gray-500 rounded-full px-4 py-2 text-[14px] ml-2 text-gray-700 w-full">
              <span className="truncate font-bold">{user.name}</span>
            </div>
            <div className="flex items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-grey-100 border border-gray-500 rounded-full py-1.5 pr-1.5 pl-4 text-[14px] ml-2 text-gray-700 w-full">
              <span className="truncate font-semibold">HMRC Account Connected?</span>
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
              <div className=" relative flex items-center gap-2 bg-linear-to-tr from-gray-300 via-gray-300 to-grey-100 border border-gray-500 rounded-full py-1.5 pr-1.5 pl-4 text-[14px] ml-2 text-gray-700 w-full">
                <span className="truncate font-semibold" title="National Insurance number">N.I. Number</span>
                <input id="nino" name="nino" className="bg-white/90 rounded-lg pl-3 font-light" disabled={entered} placeholder="AA000000A" value={nino} onChange={e=>setNino(e.target.value)} />
                <button
                  className="w-7 h-7 bg-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  onClick={() => NIHandler(nino, user?.sub)}
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
                  <span className="text-[10px] bg-gray-400/90 rounded-full w-fit whitespace-nowrap p-4 absolute top-10 ">
                    Enter your National Insurance number in the format 'AA000000A'.
                  </span>
                }
                </div>
              }
          </div>
        </div>
      </div>
      { businessList && 
        <div className="border-2 border-blue-500 rounded-4xl m-6 p-3 pb-0 shadow-2xl h-min bg-linear-to-tr from-gray-200 to-40% to-gray-50 ">
          <h2 className="text-3xl font-bold ml-2 mt-2 -mb-6">Your Business{businessList.listOfBusinesses.length > 1 ? 'es' : ''}</h2>
          <div className="flex flex-col justify-center items-center mt-6 rounded-4xl p-5 text-[14px] text-gray-700 max-w-full">
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