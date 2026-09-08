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
    <div className="flex flex-col items-center justify-center bg-sky-75 p-3 w-[99%] h-full border-2 -z-50 border-blue-500 rounded-2xl rounded-tl-none transition-all duration-75">
      <div className="w-full h-full rounded-2xl bg-white p-6 flex flex-col items-center justify-start">
        {user ? (
          <div className="flex flex-col justify-between h-full w-full items-center">
            <div className="flex flex-col justify-start items-center w-full h-full">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">Your Account</h1>
              <div className="h-3" />
              <Profile accessToken={accessToken}/>
              <div className="h-6" />
            </div>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex flex-col align-items-center justify-content-center">
            <h3 className="text-xl font-bold text-stone-700 tracking-tight text-center">Submit your quarterly updates and end of year tax returns easily with</h3>
            <Image src="/images/rectWithNJTD.png" width="500" height="100" alt="Digital Tax." />
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