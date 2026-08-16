import Link from 'next/link';

export default function DevHome() {
  return (
    <div>
      <p className="text-lg leading-relaxed">
        Welcome to the developer documentation for the Digital Tax app by NJTD.  
        Use the sidebar to navigate through the documentation, or use the searchbar above to search for specific information.
      </p>
      <h2 className="underline font-semibold text-2xl mt-5 mb-3">Contents</h2>
      <ul className="list-disc">
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/dev/api-design">API Design</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/dev/architecture">Architecture</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/dev/fraud-prevention">Fraud Prevention Headers</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/dev/hmrc-oath">HMRC OAuth</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/dev/roadmap">Roadmap</Link></li>
      </ul>
    </div>
  );
}
