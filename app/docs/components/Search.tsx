"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const allDocs = [
  { title: "Linking HMRC", href: "/docs/user/linking-hmrc" },
  { title: "Quarterly Updates", href: "/docs/user/quarterly-updates" },
  { title: "Tax Returns", href: "/docs/user/tax-returns" },
  { title: "Troubleshooting", href: "/docs/user/troubleshooting" },
  { title: "Architecture", href: "/docs/dev/architecture" },
  { title: "HMRC OAuth", href: "/docs/dev/hmrc-oauth" },
  { title: "Fraud Prevention", href: "/docs/dev/fraud-prevention" },
  { title: "API Design", href: "/docs/dev/api-design" },
  { title: "Roadmap", href: "/docs/dev/roadmap" },
];

export default function Search() {
  const [ title, setTitle ]= useState('');
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    switch (pathname.split("/")[2]) {
      case "user":
        setTitle('User Documentation');
        break;
      case "dev":
        setTitle('Developer Documentation');
        break;
      default:
        setTitle('Documentation');
        break;
    }
  }, [pathname])

  const results = allDocs.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="sticky top-20 overflow-visible">
      <h1 className="text-6xl  font-bold text-center -mt-2 mb-5">{title}</h1>

      <div className="w-5/7 flex flex-col justify-self-center relative">
        <input
          type="text"
          id="docsSearch"
          name="docsSearch"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-8 sticky top-0 mb-6 border border-neutral-300 rounded-2xl px-3 py-2 bg-white flex justify-self-center"
        />

        {query && (
          <ul id="resultsList"
          className={clsx(
            ' absolute top-5 w-full mt-3 border border-neutral-600 rounded-2xl overflow-hidden transition-all duration-150 bg-white',
            {
              'slideDown': results
            },
          )}>
            {
            results.map((doc) => (
              <li key={doc.href} className="rounded-2xl">
                <Link
                  href={doc.href}
                  className="block px-3 py-2 hover:bg-neutral-100"
                >
                  {doc.title}
                </Link>
              </li>
            ))
          }
          </ul>
        )}
      </div>
    </div>
  );
}
