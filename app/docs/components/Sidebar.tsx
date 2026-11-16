"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const sections = {
  User: [
    { title: "User Documentation", href: "/docs/user"},
    { title: "Linking HMRC", href: "/docs/user/linking-hmrc" },
    { title: "Business Overview", href: "/docs/user/business-overview"},
    { title: "Income & Expendature", href: "/docs/user/income-and-expendature"},
    { title: "Record CSV import and export", href: "/docs/user/record-csv" },
    { title: "Quarterly Updates", href: "/docs/user/quarterly-updates" },
    { title: "Tax Returns", href: "/docs/user/year-end-tax-return" },
    { title: "Troubleshooting", href: "/docs/user/troubleshooting" },
  ],
  Developer: [
    { title: "Developer Documentation", href: "/docs/dev"},
    { title: "Architecture", href: "/docs/dev/architecture" },
    { title: "HMRC OAuth", href: "/docs/dev/hmrc-oauth" },
    { title: "Fraud Prevention", href: "/docs/dev/fraud-prevention" },
    { title: "API Design", href: "/docs/dev/api-design" },
    { title: "Roadmap", href: "/docs/dev/roadmap" },
  ],
};

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const homeActive = pathname === '/docs';
  const userActive = pathname === '/docs/user';
  const devActive = pathname === '/docs/dev';
  return (
    <aside className="w-full shrink-0 border-b border-neutral-300 px-4 py-3 md:w-56 md:border-b-0 md:border-r md:px-4 md:py-6">
      <button
        type="button"
        className="w-full rounded-lg border border-mauve-700 bg-white px-4 py-2 text-left font-semibold text-slate-900 md:hidden"
        aria-expanded={open}
        aria-controls="documentation-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide documentation menu" : "Show documentation menu"}
      </button>
      <nav id="documentation-navigation" aria-label="Documentation" className={`${open ? "block" : "hidden"} space-y-6 pt-4 md:block md:pt-0`}>
      <Link href="/docs" className={`px-2 rounded-l-2xl ${ homeActive ? "block px-2 py-1 bg-linear-to-r from-mauve-100 to-white to-60% h-min font-bold" : "hover:bg-linear-to-r hover:from-mauve-100 hover:to-white hover:to-60% font-semibold hover:font-bold" }`}><h3 className="text-2xl">Home</h3></Link>
      {Object.entries(sections).map(([section, links]) => (
        <div key={section}>
          <Link href={links[0].href} className={`text-xl block px-2 py-1 rounded-l-2xl ${ links[0].href === "/docs/user" && userActive ? "bg-linear-to-r from-mauve-100 to-white to-60% h-min font-bold" : links[0].href === "/docs/dev" && devActive ? "bg-linear-to-r from-mauve-100 to-white to-60% font-bold" : "hover:bg-linear-to-r hover:from-mauve-100 hover:to-white hover:to-60% font-semibold hover:font-bold" }`}><h3 className="text-xl">{section}</h3></Link>
          <ul className="space-y-2">
            {links.map((link, i) => {
              if (i === 0){
                return;
              } else {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link href={link.href} className={`block px-2 py-1 rounded-l-2xl ${ active ? "bg-linear-to-r from-mauve-100 to-white to-60% font-medium text-lg" : "hover:bg-linear-to-r hover:from-mauve-100 hover:to-white hover:to-60% hover:font-medium hover:text-lg" }`}>
                      {link.title}
                    </Link>
                  </li>
                );
              }
            })}
          </ul>
        </div>
      ))}
      </nav>
    </aside>
  );
}
