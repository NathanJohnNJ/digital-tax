import Link from 'next/link';
import NavLinks from './navlinks';
import Image from 'next/image';
import { auth0 } from '@/lib/auth0';
import { canAccessTesting } from '@/app/utils/testingAccess';

export default async function SideNav() {
  const session = await auth0.getSession();
  const showTestingLink = Boolean(session && canAccessTesting(session.user?.email));

  return (
    <div className="flex h-full flex-col py-4 w-min bg-linear-40 from-zinc-300 to-zinc-50 to-130%">
      <Link className="mb-2 flex items-center justify-center p-2" href="/">
        <div className="w-40 flex items-center justify-center">
          <Image src="/images/roundLogo.png" width="150" height="150" alt="Digital Tax Logo" className="flex self-center justify-self-center" loading="eager" />
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks canAccessTesting={showTestingLink} />
      </div>
    </div>
  );
}