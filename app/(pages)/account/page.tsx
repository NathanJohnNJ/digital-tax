import { auth0 } from '@/lib/auth0';
import { ensureAppUser } from '@/lib/appUser';
import { hasHmrcAuthorization } from '@/lib/hmrcTokens';
import LoginButton from '../../components/auth/LoginButton';
import LogoutButton from '../../components/auth/LogoutButton';
import Profile from '../../components/Profile';
import Image from 'next/image';

export default async function AccountHome(){
  const session = await auth0.getSession();
  const user = session?.user;
  let hmrcConnected = false;

  if (user?.sub) {
    try {
      const appUser = await ensureAppUser(user);
      hmrcConnected = await hasHmrcAuthorization(appUser.id);
    } catch (error) {
      console.error("Unable to load the signed-in user's account status", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw error;
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center bg-sky-75 p-2 sm:p-3 border-2 border-blue-500 rounded-2xl rounded-tl-none">
      <div className="w-full flex-1 rounded-2xl bg-white p-3 sm:p-6 flex flex-col items-center justify-start">
        {user ? (
          <div className="flex flex-1 flex-col justify-between w-full items-center">
            <div className="flex flex-col justify-start items-center w-full">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">Your Account</h1>
              <div className="h-3" />
              <Profile hmrcConnected={hmrcConnected}/>
              <div className="h-6" />
            </div>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex flex-col align-items-center justify-content-center">
            <h3 className="text-xl font-bold text-stone-700 tracking-tight text-center">Submit your quarterly updates and end of year tax returns easily with</h3>
            <Image src="/images/rectWithNJTD.png" className="aspect-7.5/2 self-center -ml-6" width="500" height="100" alt="Digital Tax." />
            <p className="text-lg text-gray-400 text-center mt-2">
              Get started by logging in to your account
            </p>
            <div className="h-3" />
            <LoginButton />
          </div>
        )}
      </div>
    </div>
  )
}