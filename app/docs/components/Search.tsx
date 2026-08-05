"use client";

import { useState } from "react";
import Link from "next/link";

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
  const [query, setQuery] = useState("");

  const results = allDocs.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mb-6 fixed w-full top-0 bg-white">
      <input
        type="text"
        placeholder="Search documentation..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-neutral-300 rounded px-3 py-2"
      />

      {query && (
        <ul className="mt-3 border border-neutral-200 rounded">
          {results.map((doc) => (
            <li key={doc.href}>
              <Link
                href={doc.href}
                className="block px-3 py-2 hover:bg-neutral-100"
              >
                {doc.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
