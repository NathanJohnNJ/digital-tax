import Link from 'next/link';

export default async function Page() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-taupe-100 w-full h-full border-2 border-taupe-500 rounded-2xl transition-all duration-75 text-slate-700 mr-0.5">
      <div className="flex flex-col items-center p-8 w-full h-full bg-white overflow-y-scroll rounded-xl shadow-2xl">
        <h2 className="font-extrabold text-5xl">Digital Tax</h2>
        <h2 className="font-extrabold text-5xl">Cookie Policy</h2>

        <div className="p-10 max-w-4xl">
          <p className="ml-2">
            This Cookie Policy explains how NJTD uses cookies and similar technologies on the Digital Tax web application at <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://dt.njtd.xyz">https://dt.njtd.xyz</Link>. It explains what cookies are, why we use them, and how you can control them.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">What are cookies?</h3>
          <p className="ml-2">
            Cookies are small text files placed on your device when you visit a website. They help the site remember information about your visit and improve your experience. Similar technologies include local storage and web beacons.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Why we use cookies</h3>
          <p className="ml-2">
            We use cookies for essential functionality, security, and (where you consent) analytics. Cookies help us:
          </p>
          <ul className="ml-6 list-disc">
            <li>Keep you logged in and manage your session (essential).</li>
            <li>Secure the App and detect suspicious activity (security).</li>
            <li>Understand how the App is used so we can improve it (analytics, only with consent).</li>
          </ul>

          <h3 className="font-bold text-2xl mt-6 mb-1">Cookies we may use</h3>
          <p className="ml-2">
            The exact cookies in use may change over time. Typical cookies used by Digital Tax include:
          </p>
          <ul className="ml-6 list-disc">
            <li><strong>Essential / Strictly necessary cookies</strong> — required for the App to function. Examples: session identifiers created by <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link> to keep you authenticated; <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link> session tokens used to maintain your logged-in state. These cookies do not require consent.</li>
            <li><strong>Security cookies</strong> — used to detect and prevent fraud and abuse, and to protect user accounts and data.</li>
            <li><strong>Functional cookies</strong> — remember preferences or UI settings to improve your experience.</li>
            <li><strong>Analytics cookies</strong> — used to collect anonymous usage statistics (for example page views and errors). We only set analytics cookies if you give consent. If you enable analytics, we may use a third-party analytics provider; their cookies and processing are subject to their own policies.</li>
          </ul>

          <h3 className="font-bold text-2xl mt-6 mb-1">Third-party cookies</h3>
          <p className="ml-2">
            We rely on third-party providers (<Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link>, <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link>, and potentially analytics providers). These providers may set cookies when you interact with their services. We do not control third-party cookie practices; please review their privacy and cookie policies for details:
          </p>
          <ul className="ml-6 list-disc">
            <li><Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link></li>
            <li><Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link></li>
          </ul>

          <h3 className="font-bold text-2xl mt-6 mb-1">Consent and managing cookies</h3>
          <p className="ml-2">
            Where required by law, we will obtain your consent before setting non-essential cookies (for example analytics). You can manage or withdraw consent at any time using the cookie controls provided in the App (if available) or via your browser settings.
          </p>
          <p className="ml-2">
            To block or delete cookies using your browser, follow the instructions for your browser (for example Chrome, Firefox, Safari, Edge). Blocking essential cookies may prevent the App from functioning correctly.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">How to opt out of analytics</h3>
          <p className="ml-2">
            If we use analytics cookies, we will provide a clear opt-in mechanism. If you have previously consented and wish to opt out, use the cookie controls in the App or clear cookies for <strong>dt.njtd.xyz</strong> in your browser.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Changes to this Cookie Policy</h3>
          <p className="ml-2">
            We may update this Cookie Policy from time to time. We will publish the updated policy on this page and, where required, obtain fresh consent for non-essential cookies.
          </p>

          <p className="ml-2 mt-6">
            <p className="text-center"><strong>Last updated:</strong><br></br><span title="12th August 2026" className="underline font-semibold text-lg">12/08/2026</span></p>
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Contact</h3>
          <p className="ml-2">
            For questions about cookies or to request details of cookies in use, contact: <Link className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-slate-600" href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20-%20Cookie%20enquiry">dt@njtd.xyz</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
