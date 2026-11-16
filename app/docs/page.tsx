import Link from 'next/link';

export default function DocsHome() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">Wondering How Things Work?<br></br><span className="delay-entry block text-xl text-slate-700/80 sm:text-2xl">...You've come to the right place</span></h1>
      <p className="w-full pt-8 text-lg leading-relaxed sm:w-[85%]">
        Welcome to the documentation for Digital Tax by NJTD.  
        Use the sidebar to explore user guides, developer references,  
        and technical details about how the system works.
      </p>
      <div className="mt-10 flex w-full flex-col items-center justify-evenly gap-4 lg:flex-row">
        <Link href="/docs/user" className="w-full max-w-64 rounded-4xl border-2 border-mauve-700 bg-linear-60 from-mauve-400 to-mauve-100 p-6 text-center text-xl text-slate-900 shadow-xl hover:font-bold hover:shadow-2xl">User<br></br>Documentation</Link>
        <Link href="/docs/dev" className="w-full max-w-64 rounded-4xl border-2 border-mauve-700 bg-linear-60 from-mauve-400 to-mauve-100 p-6 text-center text-xl text-slate-900 shadow-xl hover:font-bold hover:shadow-2xl">Developer<br></br>Documentation</Link>
      </div>
    </div>
  );
}
