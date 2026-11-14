import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleHelp,
  CodeXml,
  Mail,
  ShieldCheck,
} from 'lucide-react';

const cardClassName =
  'flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm md:p-8';
const illustrationClassName =
  'mb-5 flex h-32 w-32 items-center justify-center rounded-2xl bg-green-50 text-green-800';

function PoundNoEntryIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-26 w-26"
      fill="none"
      viewBox="0 0 160 160"
    >
      <circle cx="80" cy="80" r="65" stroke="#dc2626" strokeWidth="9" />
      <path
        d="M95 75C77 81 75 67 60 76M103 55C104 43 74 35 70 56 67 74 84 84 67 107 62 115 54 106 69 104 94 102 100 114 109 102"
        stroke="#166534"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
        transform-origin="center"
        transform="translate(-3.5 2.5)"
      />
      <path
        d="m25 110 110-55"
        stroke="#dc2626"
        strokeWidth="10"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="h-[99%] w-[99.75%] ml-[-0.25%] overflow-y-auto rounded-2xl border-2 border-green-700 bg-green-75 p-3 transition-all duration-75 scrollbar-none">
      <main className="mx-auto flex min-h-full w-full flex-col items-center rounded-xl bg-white px-4 py-8 text-stone-700 sm:px-6 md:py-12">
        <Image
          src="/images/rectWithNJTD.png"
          width={600}
          height={152}
          alt="Digital Tax by NJTD"
          className="h-auto w-full max-w-105"
          loading="eager"
        />

        <header className="mt-6 flex max-w-4xl flex-col items-center text-center">
          <h1 className="text-2xl font-semibold md:text-4xl">
            Making Making Tax Digital easier
          </h1>
          <p className="mt-3 text-base leading-relaxed text-stone-600 md:text-lg">
            Manage your self-employment tax information, quarterly updates and
            year-end tax returns in one place.
          </p>
          <Link
            href="/account"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
          >
            Get Started <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        </header>

        <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
          <section aria-labelledby="free-heading" className={cardClassName}>
            <div className={illustrationClassName}>
              <PoundNoEntryIllustration />
            </div>
            <h2 id="free-heading" className="text-2xl font-bold">
              100% free to use
            </h2>
            <div className="mt-4 space-y-3 leading-relaxed text-stone-600">
              <p>
                Tired of starting on a free trial and then having to pay to
                actually submit anything?
              </p>
              <p>
                Wondering why you should have to pay to submit your tax returns
                just because the system has gone digital? Now you don&apos;t!
              </p>
              <p className="font-semibold text-stone-700">
                This is the free app you&apos;ve been waiting for to make your
                tax digital!
              </p>
            </div>
          </section>

          <section aria-labelledby="open-source-heading" className={cardClassName}>
            <div className={illustrationClassName}>
              <CodeXml aria-hidden="true" className="h-16 w-16" strokeWidth={1.5} />
            </div>
            <h2 id="open-source-heading" className="text-2xl font-bold">
              Built in the open
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              Digital Tax is{' '}
              <span className="group relative inline-flex flex-col items-center">
                <CircleHelp aria-hidden="true" aria-label="What does open source mean?" aria-describedby="open-source-explanation" className="h-4 w-4 rounded-full text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 absolute -top-2 -right-2" />
                <span className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900">
                  open source
                </span>
                <span
                  id="open-source-explanation"
                  role="tooltip"
                  className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-3 w-64 -translate-x-1/2 rounded-lg bg-stone-900 p-3 text-left text-sm font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                >
                  The app&apos;s code is public so developers can inspect it and
                  build on it. Your personal or tax information is not part of
                  that code or shared with those developers. It is handled
                  separately to provide your account and HMRC connection. Read
                  our Privacy Policy for more information.
                </span>
              </span>
              , so other developers can build on it and create additional
              functionality for consumers.
            </p>
          </section>

          <section aria-labelledby="features-heading" className={cardClassName}>
            <div className={illustrationClassName}>
              <ChartNoAxesCombined
                aria-hidden="true"
                className="h-16 w-16"
                strokeWidth={1.5}
              />
            </div>
            <h2 id="features-heading" className="text-2xl font-bold">
              What you can do
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              Connect your HMRC account, review your self-employment tax
              information, and use the app to prepare and submit quarterly
              updates and year-end tax returns.
            </p>
          </section>

          <section aria-labelledby="hmrc-heading" className={cardClassName}>
            <div className={illustrationClassName}>
              <ShieldCheck
                aria-hidden="true"
                className="h-16 w-16"
                strokeWidth={1.5}
              />
            </div>
            <h2 id="hmrc-heading" className="text-2xl font-bold">
              You stay in control
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              With your approval, Digital Tax will connect to your HMRC account.
              You sign in with HMRC directly and choose whether to authorise the
              connection; the app does not ask for your Government Gateway
              password.
            </p>
            <p className="mt-3 leading-relaxed text-stone-600">
              Digital Tax is an independent service, not an HMRC or government
              service. Visit the{' '}
              <Link
                href="https://www.gov.uk/government/organisations/hm-revenue-customs"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                HMRC website
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="contact-heading" className={`${cardClassName} lg:col-span-2`}>
            <div className={illustrationClassName}>
              <Mail aria-hidden="true" className="h-16 w-16" strokeWidth={1.5} />
            </div>
            <h2 id="contact-heading" className="text-2xl font-bold">
              Get in touch
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              Have a question? Email us at{' '}
              <a
                href="mailto:dt@njtd.xyz?subject=Digital%20Tax%20question"
                className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                dt@njtd.xyz
              </a>.
            </p>
            <p className="mt-4 leading-relaxed text-stone-600">
              A contact form is coming soon.
            </p>
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-stone-500">
          Brought to you by{' '}
          <a
            href="https://njtd.xyz"
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline"
          >
            NJTD
          </a>
        </p>
      </main>
    </div>
  );
}
