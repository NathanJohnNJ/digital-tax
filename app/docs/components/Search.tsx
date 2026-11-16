"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const allDocs = [
  { title: "Linking HMRC", href: "/docs/user/linking-hmrc" },
  { title: "Record CSV import and export", href: "/docs/user/record-csv" },
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
    <div>
      <h1 className="mb-5 break-words text-center text-2xl font-bold sm:text-4xl lg:text-5xl xl:text-6xl">{title}</h1>

      <div className="relative mx-auto flex w-full max-w-xl flex-col">
        <input
          type="text"
          id="docsSearch"
          name="docsSearch"
          aria-label="Search documentation"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-6 h-10 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
        />

        {query && (
          <ul id="resultsList"
          className={clsx(
            'absolute top-10 z-20 w-full overflow-hidden rounded-2xl border border-neutral-600 bg-white transition-all duration-150',
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
