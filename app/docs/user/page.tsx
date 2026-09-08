import Link from 'next/link';

export default function UserHome() {
  return (
    <div className="p-6 m-4 prose prose-neutral">
      <p className="text-lg leading-relaxed max-w-3xl text-justify">
        Welcome to the user documentation for the Digital Tax app by NJTD.  
        Use the sidebar to navigate through the documentation, or use the searchbar above to search for specific information.
      </p>
      <h2 className="underline font-semibold text-2xl mt-5 mb-3">Contents</h2>
      <ul className="list-disc ml-6">
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/user/linking">Linking your HMRC Account</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/user/businessOverview">Business Overview</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/user/income">Income & Expendature</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/user/quarterly">Submitting your quarterly updates</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/user/tax-return">End of year tax returns</Link></li>
        <li className="mb-2 cursor-pointer text-md hover:text-lg hover:font-medium"><Link href="/docs/user/troubleshooting">Troubleshooting</Link></li>
      </ul>
    </div>
  );
}
