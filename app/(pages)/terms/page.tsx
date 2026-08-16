import Link from 'next/link';

export default async function Page(){

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-100 w-full h-full border-2 border-slate-500 rounded-2xl transition-all duration-75 text-slate-700 mr-0.5">
      <div className="flex flex-col items-center p-8 w-full h-full bg-white overflow-y-scroll rounded-xl shadow-2xl">
        <h2 className="font-extrabold text-5xl">Digital Tax</h2>
        <h2 className="font-extrabold text-5xl">Usage Terms & Conditions</h2>
        <div className="p-10 max-w-4xl">
          <h3 className="font-bold text-2xl -mt-2 mb-1">Introduction</h3>
          <p className="ml-2">
            These Terms and Conditions (“Terms”) govern your use of the Digital Tax web application (“Digital Tax”, “the App”), provided by NJTD (“we”, “us”, “our”). By accessing or using Digital Tax, available at <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://dt.njtd.xyz">https://dt.njtd.xyz</Link>, you agree to be bound by these Terms. If you do not agree, you must not use the App.
          </p>
          <p className="ml-2">
            Digital Tax is developed and maintained by Nathan John trading as NJTD. Our main website is <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://njtd.xyz">https://njtd.xyz</Link>.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">About Digital Tax</h3>
          <p className="ml-2">
            Digital Tax is an online application designed to help users interact with HMRC’s Making Tax Digital (MTD) services. The App enables users to:
          </p>
          <ul className="ml-6 list-disc">
            <li>Create and manage an account.</li>
            <li>Connect their account to their HMRC MTD account.</li>
            <li>View information related to their self-employment businesses as held by HMRC.</li>
            <li>Submit quarterly updates and annual tax return information to HMRC, including income and expenditure details.</li>
          </ul>
          <p className="ml-2">
            Digital Tax is not an accounting service, tax advisory service, or substitute for professional financial advice.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">User Accounts</h3>
          <p className="ml-2">
            To use Digital Tax, you must create an account. Authentication is handled by <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link>, and certain account details are stored securely within a <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link> database. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
          </p>
          <p className="ml-2">
            You agree to provide accurate and complete information when creating your account and to keep your details up to date.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">HMRC Integration</h3>
          <p className="ml-2">
            Digital Tax connects to HMRC systems using official MTD APIs. By linking your HMRC account, you authorise Digital Tax to retrieve and display information related to your self-employment businesses and to submit updates or returns on your behalf when you choose to do so.
          </p>
          <p className="ml-2">
            You remain fully responsible for the accuracy of any information submitted to HMRC through the App.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Data Handling</h3>
          <p className="ml-2">
            Digital Tax processes certain personal data as part of providing its services. Authentication data is processed by Auth0, and account-related data is stored in Supabase. We do not store any tax or employment details retrieved from HMRC. The only HMRC-related personal identifier stored by us is your National Insurance number, which is linked to your user account solely to enable the App to retrieve and display your self-employment information from HMRC.
          </p>
          <p className="ml-2">
            Full details of how your data is processed, stored, and protected are provided in our separate <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://dt.njtd.xyz/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Acceptable Use</h3>
          <p className="ml-2">You agree not to use Digital Tax for any unlawful, harmful, or abusive purpose, including but not limited to:</p>
          <ul className="ml-6 list-disc">
            <li>Attempting to gain unauthorised access to the App or its infrastructure.</li>
            <li>Interfering with or disrupting the App’s functionality.</li>
            <li>Submitting false, misleading, or fraudulent information to HMRC.</li>
            <li>Reverse engineering, copying, or modifying any part of the App.</li>
          </ul>
          <h3 className="font-bold text-2xl mt-4 mb-1">Service Availability</h3>
          <p className="ml-2">
            We aim to provide continuous access to Digital Tax, but we do not guarantee that the App will always be available, error-free, or free from interruptions. Maintenance, updates, or issues with third-party services (including <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://www.gov.uk/" rel="noreferrer" target="_blank">HMRC</Link>, <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link>, or <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link>) may affect availability.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Third-Party Services</h3>
          <p className="ml-2">
            Digital Tax relies on third-party services including <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link> for authentication, <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link> for database storage, and <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://www.gov.uk/" rel="noreferrer" target="_blank">HMRC</Link> for tax-related data and submissions. We are not responsible for the performance, availability, or security of these external services.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">No Professional Advice</h3>
          <p className="ml-2">
            Digital Tax provides tools for interacting with HMRC but does not offer tax advice, financial advice, or accounting services. You are solely responsible for ensuring that any information submitted to HMRC is correct and complete. If you require professional guidance, you should consult a qualified accountant or tax adviser.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Limitation of Liability</h3>
          <p className="ml-2">
            To the fullest extent permitted by UK law, NJTD and its developer (Nathan John) shall not be liable for any loss, damage, or claim arising from:
          </p>
          <ul className="ml-6 list-disc">
            <li>Your use or inability to use the App.</li>
            <li>Errors or inaccuracies in data retrieved from HMRC.</li>
            <li>Incorrect submissions made by you through the App.</li>
            <li>Issues caused by third-party services or integrations.</li>
            <li>Any indirect, incidental, or consequential damages.</li>
          </ul>
          <p className="ml-2">
            Nothing in these Terms limits liability where such limitation is prohibited by law, including liability for fraud or fraudulent misrepresentation.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Intellectual Property</h3>
          <p className="ml-2">
            All content, code, design, and branding associated with Digital Tax are the intellectual property of NJTD. You may not copy, reproduce, distribute, or create derivative works without prior written permission.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Termination</h3>
          <p className="ml-2">
            We reserve the right to suspend or terminate your access to Digital Tax at any time if you breach these Terms or if required for security, maintenance, or legal reasons.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Governing Law</h3>
          <p className="ml-2">
            These Terms are governed by the laws of England and Wales. Any disputes arising from your use of Digital Tax shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Changes to These Terms</h3>
          <p className="ml-2">
            We may update these Terms from time to time. Any changes will be posted on this page, and continued use of the App after changes are made constitutes acceptance of the updated Terms.
          </p>
          <p className="text-center">These Terms were last updated on <br></br><span title="12th August 2026" className="underline font-semibold text-lg">12/08/2026</span>.</p>
          <h3 className="font-bold text-2xl mt-4 mb-1">Contact Information</h3>
          <p className="ml-2">
            If you have any questions about these Terms, please contact Nathan John at NJTD via our website at <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://njtd.xyz">https://njtd.xyz</Link> or via email using <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20-%20Terms%20and%20Conditions%20enquiry">dt@njtd.xyz</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}