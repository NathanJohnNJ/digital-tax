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
    <div className="flex flex-col items-center p-3 bg-amber-75 w-full h-full border-2 border-amber-500 rounded-2xl transition-all duration-75 text-slate-700 overflow-y-auto scrollbar-none">
      <div className="flex shrink-0 flex-col items-center gap-6 p-8 w-full min-h-full bg-white rounded-xl shadow-xl">
        <h2 className="font-extrabold text-5xl">Fraud Header Test</h2>
        <p className="max-w-2xl text-center">
          Temporary production diagnostic. This sends the generated fraud-prevention headers to HMRC Sandbox for validation.
          Only the HMRC feedback is displayed; the headers are not shown.
        </p>
        <Test />
        <IpDiagnostics />
	
	<h2 className="font-extrabold text-5xl">Testing Resources</h2>
      	<div className="flex mt-6 p-6 h-full w-full items-center justify-center">
        	<GetServices />
        	<CreateTestUser />
      	</div>
      </div>
    </div>
  )
}