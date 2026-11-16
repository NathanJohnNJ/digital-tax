import Link from 'next/link';
import NavLinks from './navlinks';
import Image from 'next/image';
import { auth0 } from '@/lib/auth0';

const testingAllowedEmailsValue = process.env.TESTING_ALLOWED_USER_EMAILS ?? '';
const allowedTestingEmails = testingAllowedEmailsValue
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default async function SideNav() {
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();
  const canAccessTesting = Boolean(userEmail && allowedTestingEmails.includes(userEmail));

  return (
    <div className="sticky top-0 z-30 flex h-screen w-12 shrink-0 flex-col bg-linear-40 from-zinc-300 to-zinc-50 to-130% py-2 md:w-44 md:py-4">
      <Link className="mb-2 flex shrink-0 items-center justify-center p-1 md:p-2" href="/">
        <div className="flex w-10 items-center justify-center md:w-40">
          <Image src="/images/roundLogo.png" width="150" height="150" alt="Digital Tax Logo" className="h-auto w-full" loading="eager" />
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <NavLinks canAccessTesting={canAccessTesting} />
      </div>
    </div>
  );
}