"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = {
  User: [
    { title: "User Documentation", href: "/docs/user"},
    { title: "Linking HMRC", href: "/docs/user/linking-hmrc" },
    { title: "Business Overview", href: "/docs/user/business-overview"},
    { title: "Income & Expendature", href: "/docs/user/income-and-expendature"},
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
  const pathname = usePathname();
  const homeActive = pathname === '/docs';
  const userActive = pathname === '/docs/user';
  const devActive = pathname === '/docs/dev';
  return (
    <aside className="w-fit border-r border-neutral-300 py-6 pl-6 space-y-8 mt-30 -mr-5">
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
    </aside>
  );
}
