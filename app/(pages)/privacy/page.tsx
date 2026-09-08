import Link from 'next/link';

export default async function Page() {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-neutral-75 w-[99.75%] h-[99%] border-2 border-neutral-500 rounded-2xl transition-all duration-75 text-slate-700">
      <div className="flex flex-col items-center p-8 w-full h-full bg-white overflow-y-scroll rounded-xl shadow-2xl">
        <h2 className="font-extrabold text-5xl">Digital Tax</h2>
        <h2 className="font-extrabold text-5xl">Privacy Policy</h2>

        <div className="pt-6 max-w-5xl">
          <p className="ml-2">
            This Privacy Policy explains how NJTD (developer: <strong>Nathan John</strong>) collects, uses, stores, and shares personal data when you use the Digital Tax web application (“Digital Tax”, “the App”) available at <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://dt.njtd.xyz">https://dt.njtd.xyz</Link>. It also explains your rights under UK data protection law.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Controller</h3>
          <p className="ml-2">
            The data controller for Digital Tax is <strong>Nathan John</strong> trading as <strong>NJTD</strong>. Our main website is <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://njtd.xyz">https://njtd.xyz</Link>.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Contact</h3>
          <p className="ml-2">
            For privacy enquiries, data access requests, or to exercise your rights, contact: <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20-%20Privacy%20enquiry">dt@njtd.xyz</Link>.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Personal Data We Collect</h3>
          <p className="ml-2">
            We collect and process the following categories of personal data:
          </p>
          <ul className="ml-6 list-disc">
            <li><strong>Account and authentication data:</strong> email address, name (if provided), authentication identifiers processed by <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link>.</li>
            <li><strong>Identifiers required for HMRC access:</strong> National Insurance number (NINO) — stored in our <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link> database and linked to your user account to enable HMRC data retrieval and display.</li>
            <li><strong><Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://gov.uk/" rel="noreferrer" target="_blank">HMRC</Link> data:</strong> information retrieved from <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://gov.uk/" rel="noreferrer" target="_blank">HMRC</Link> about your self-employment businesses (income, expenses, returns, filing status). We do not store HMRC tax or employment details beyond what is necessary to display them in the App unless you explicitly request otherwise.</li>
            <li><strong>Usage and technical data:</strong> IP address, browser and device information, session identifiers, and other technical logs necessary to operate and secure the App. Any device specific information collected is done so in accordance with HMRC's fraud prevention requirements and is required under UK law. None of this information is stored by NJTD. The information is generated, and temporarily stored, on your local machine (the machine you are accessing Digital Tax from).</li>
          </ul>

          <h3 className="font-bold text-2xl mt-6 mb-1">How We Obtain Data</h3>
          <p className="ml-2">
            Data is obtained directly from you when you create an account and link your HMRC MTD account. Additional data is retrieved from HMRC APIs after you authorise the connection. Authentication is handled by <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link> and account storage is handled by <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link>.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Purposes and Legal Bases for Processing</h3>
          <p className="ml-2">
            We process personal data for the following purposes and legal bases:
          </p>
          <ul className="ml-6 list-disc">
            <li><strong>Providing the service:</strong> creating and managing your account, linking to <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://gov.uk/" rel="noreferrer" target="_blank">HMRC</Link>, retrieving and displaying your self-employment data, and submitting updates/returns to HMRC. <em>Legal basis:</em> performance of a contract with you and necessary steps at your request.</li>
            <li><strong>Authentication and security:</strong> to authenticate users and protect accounts. <em>Legal basis:</em> legitimate interests (security) and contract performance.</li>
            <li><strong>Compliance and legal obligations:</strong> to comply with legal obligations where applicable. <em>Legal basis:</em> legal obligation.</li>
            <li><strong>Cookies and analytics:</strong> where we use cookies or analytics, we rely on consent for non-essential cookies. You can withdraw consent at any time. <em>Legal basis:</em> consent.</li>
          </ul>

          <h3 className="font-bold text-2xl mt-6 mb-1">Sharing and Third Parties</h3>
          <p className="ml-2">
            We share personal data only as necessary to provide the App:
          </p>
          <ul className="ml-6 list-disc">
            <li><strong><Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link></strong> — authentication provider; processes authentication data on our behalf.</li>
            <li><strong><Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link></strong> — database and storage provider; stores account records and the National Insurance number used to link HMRC data.</li>
            <li><strong><Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://gov.uk/" rel="noreferrer" target="_blank">HMRC</Link></strong> — we access HMRC data only with your authorisation via the official MTD APIs and submit returns/updates when you instruct the App to do so.</li>
            <li>Other service providers where required for operation, security, or legal compliance (e.g., hosting, monitoring). We require processors to implement appropriate safeguards and process data only on our instructions.</li>
          </ul>

          <h3 className="font-bold text-2xl mt-6 mb-1">International Transfers</h3>
          <p className="ml-2">
            Some third-party services we use (for example <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link> or <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link>) may transfer or store data outside the UK/EEA. Where transfers occur, we rely on appropriate safeguards such as UK adequacy decisions, Standard Contractual Clauses, or other lawful transfer mechanisms. Contact us if you need details about specific transfers.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Data Retention</h3>
          <p className="ml-2">
            We retain personal data only for as long as necessary to provide the service, comply with legal obligations, resolve disputes, and enforce our agreements. Account data (including your National Insurance number) is retained while your account exists and for a reasonable period after account deletion to meet legal or operational needs. If you wish to request deletion, contact us at <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20-%20Data%20Deletion%20Request">dt@njtd.xyz</Link>.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Security</h3>
          <p className="ml-2">
            We implement reasonable technical and organisational measures to protect personal data, including encryption in transit (HTTPS), secure authentication via <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://auth0.com/" rel="noreferrer" target="_blank">Auth0</Link>, and access controls for our <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="https://supabase.com/" rel="noreferrer" target="_blank">Supabase</Link> database. However, no system is completely secure; if a data breach affecting your personal data occurs, we will notify you and the Information Commissioner's Office (ICO) where required by law.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Your Rights</h3>
          <p className="ml-2">
            Under UK data protection law you have rights in relation to your personal data, including:
          </p>
          <ul className="ml-6 list-disc">
            <li>Right of access to the personal data we hold about you.</li>
            <li>Right to rectification of inaccurate or incomplete data.</li>
            <li>Right to erasure (right to be forgotten) in certain circumstances.</li>
            <li>Right to restriction of processing in certain circumstances.</li>
            <li>Right to data portability where processing is based on consent or contract and carried out by automated means.</li>
            <li>Right to object to processing based on legitimate interests.</li>
            <li>Right to withdraw consent where processing is based on consent (for example non-essential cookies).</li>
          </ul>
          <p className="ml-2">
            To exercise any of these rights, contact us at <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20-%20Data%20Subject%20Request">dt@njtd.xyz</Link>. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) if you believe your rights have been violated.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Children</h3>
          <p className="ml-2">
            Digital Tax is intended for use by adults. We do not knowingly collect personal data from children under 16. If you believe we have collected data from a child, contact us and we will take steps to delete it.
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Changes to this Policy</h3>
          <p className="ml-2">
            We may update this Privacy Policy from time to time. We will publish the updated policy on this page. Continued use of the App after changes are posted constitutes acceptance of the updated policy.
          </p>

          <p className="ml-2 mt-6">
            <strong>Last updated:</strong> <span className="underline font-semibold">12/08/2026</span>
          </p>

          <h3 className="font-bold text-2xl mt-6 mb-1">Contact</h3>
          <p className="ml-2">
            For privacy questions or to exercise your rights, contact: <Link className="cursor-pointer font-semibold text-neutral-800 hover:underline hover:decoration-double hover:decoration-blue-600/80 hover:font-bold hover:text-neutral-600" href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20-%20Privacy%20enquiry">dt@njtd.xyz</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
