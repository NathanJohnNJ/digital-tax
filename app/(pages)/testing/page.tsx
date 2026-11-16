import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import CreateTestUser from '@/app/components/test/createTestUser';
import GetServices from '@/app/components/test/getServices';
import IpDiagnostics from '@/app/components/test/IpDiagnostics';
import Test from '@/app/components/test/Test';

const testingAllowedEmailsValue = process.env.TESTING_ALLOWED_USER_EMAILS;
const allowedTestingEmails = testingAllowedEmailsValue
  ? testingAllowedEmailsValue
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];

if (process.env.NODE_ENV !== 'production' && testingAllowedEmailsValue === undefined) {
  throw new Error('TESTING_ALLOWED_USER_EMAILS is required in non-production environments.');
}

export default async function Page(){
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();

  if (!userEmail || !allowedTestingEmails.includes(userEmail)) {
    redirect('/account');
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center p-2 sm:p-3 bg-amber-75 w-full border-2 border-amber-500 rounded-2xl text-slate-700">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-6 p-3 sm:p-8 w-full bg-white rounded-xl shadow-xl">
        <h2 className="text-center font-extrabold text-3xl sm:text-5xl">Fraud Header Test</h2>
        <p className="max-w-2xl text-center">
          Temporary production diagnostic. This sends the generated fraud-prevention headers to HMRC Sandbox for validation.
          The feedback and headers for this request are shown below.
        </p>
        <Test />
        <IpDiagnostics />

        <h2 className="text-center font-extrabold text-3xl sm:text-5xl">Testing Resources</h2>
        <div className="flex w-full min-w-0 flex-col items-center justify-center gap-4">
          <GetServices />
          <CreateTestUser />
        </div>
      </div>
    </div>
  )
}