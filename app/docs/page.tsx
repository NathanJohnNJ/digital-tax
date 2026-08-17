import Link from 'next/link';

export default function DocsHome() {
  return (
    <div className="flex flex-col items-center justify-center max-w-4xl justify-self-center">
      <h1 className="text-4xl font-bold my-15 relative">Wondering How Things Work?<br></br><span className="text-2xl absolute -right-8 delay-entry text-slate-700/80">...You've come to the right place</span></h1>
      <p className="text-lg leading-relaxed pt-10 w-[85%]">
        Welcome to the documentation for Digital Tax by NJTD.  
        Use the sidebar to explore user guides, developer references,  
        and technical details about how the system works.
      </p>
      <div className="flex items-center justify-evenly w-full mt-20">
        <Link href="/docs/user" className="border-2 rounded-4xl border-mauve-700 shadow-xl hover:shadow-2xl hover:scale-115 bg-linear-60 from-mauve-400 to-mauve-100 text-slate-800 hover:font-bold text-center p-8 text-2xl">User<br></br>Documentation</Link>
        <Link href="/docs/dev" className="border-2 rounded-4xl border-mauve-700 shadow-xl hover:shadow-2xl hover:scale-115 bg-linear-60 from-mauve-400 to-mauve-100 text-slate-800 hover:font-bold text-center p-8 text-2xl">Developer<br></br>Documentation</Link>
      </div>
    </div>
  );
}
