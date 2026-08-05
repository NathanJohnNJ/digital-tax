"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = {
  User: [
    { title: "User Documentation", href: "/docs/user"},
    { title: "Linking HMRC", href: "/docs/user/linking" },
    { title: "Quarterly Updates", href: "/docs/user/quarterly" },
    { title: "Tax Returns", href: "/docs/user/tax-return" },
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
  return (
    <aside className="w-64 border-r border-neutral-200 p-6 space-y-8">
      <Link href="/docs" className={`px-2 rounded ${ homeActive ? "bg-neutral-200 font-bold" : "hover:bg-neutral-100 font-semibold hover:font-bold" }`}><h3 className="text-lg">Home</h3></Link>
      {Object.entries(sections).map(([section, links]) => (
        <div key={section}>
          <Link href={links[0].href}><h3 className="text-lg font-semibold mb-3">{section}</h3></Link>
          <ul className="space-y-2">
            {links.map((link, i) => {
              if (i === 0){
                return;
              } else {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link href={link.href} className={`block px-2 py-1 rounded ${ active ? "bg-neutral-200 font-medium text-lg" : "hover:bg-neutral-100 hover:font-medium hover:text-lg" }`}>
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
