import { auth0 } from '@/lib/auth0';
import LoginButton from '../../components/auth/LoginButton';
import LogoutButton from '../../components/auth/LogoutButton';
import Profile from '../../components/Profile';
import { cookies } from 'next/headers';
import Image from 'next/image';

export default async function AccountHome(){
  const session = await auth0.getSession();
  const user = session?.user;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-sky-100 w-full h-full">
      {user ? (
        <>
          <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">Your Account</h1>
          <div className="h-3" />
          <div className="w-full h-px bg-gray-100" />
          <Profile accessToken={accessToken}/>
          <div className="h-6" />
          <LogoutButton />
        </>
      ) : (
        <div className="flex flex-col align-items-center justify-content-center">
          <h3 className="text-xl font-bold text-stone-700 tracking-tight text-center">Submit your quarterly updates and end of year tax returns easily with</h3>
          <Image src="/images/rectWithNJTD.png" width="500" height="100" alt="Digital Tax logo." />
          <p className="text-lg text-gray-400 text-center mt-2">
            Get started by logging in to your account
          </p>
          <div className="h-3" />
          <LoginButton />
        </div>
      )}
    </div>
  )
}