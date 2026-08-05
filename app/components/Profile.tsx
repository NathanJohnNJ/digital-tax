"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import HMRCButton from './auth/hmrcAccountLinkButton';

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

export default function Profile(props: HMRCProps) {
  const { user, isLoading } = useUser();
  const { accessToken } = props;
  const connected = accessToken ? true : false;

  if (isLoading) return <p className="text-xs text-gray-500">Loading...</p>;
  if (!user) return null;

  return (
    <>

      <div className="flex items-center gap-2 text-green-500 text-[13px] font-medium fadeOut">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        Successfully authenticated
      </div>

      <div className="h-3" />
      <div className="flex flex-col justify-center items-center gap-2 bg-gray-100 rounded-4xl p-6 text-[14px] text-gray-700 max-w-full border border-gray-500 shadow-2xl">
        <div className="flex items-center">
          <div className="flex items-center">
            <img width="160" height="160" loading="eager" src={user.picture} className="h-40 w-40 -ml-2" alt="User avatar" />
          </div>

          <div className="flex flex-col justify-content-between items-center">


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


          </div>

        </div>
      </div>
    </>
  );
}