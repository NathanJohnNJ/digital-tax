'use client';

import {
  UserIcon,
  HomeIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

const links = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Account', href: '/account', icon: UserIcon },
  { name: 'Documentation', href: '/docs', icon: DocumentIcon }
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        if (link.href==="/"){
          return (
            <Link key={link.name} href={link.href}
            className={clsx(
              'flex h-12 grow items-center justify-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:bg-green-50 hover:text-green-700 md:flex-none md:justify-start z-50',
              {
                'bg-sky-100 text-green-700 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname === link.href
              },
            )}>
              <LinkIcon className="w-6" />
              <p className="hidden md:block">{link.name}</p>
            </Link>
          );
        } else {
          return (
            <Link key={link.name} href={link.href}
            className={clsx(
              'flex h-12 grow items-center justify-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start z-50',
              {
                'bg-sky-100 text-blue-600 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname.split("/")[1].includes(link.href.split("/")[1]),
              },
            )}>
              <LinkIcon className="w-6" />
              <p className="hidden md:block">{link.name}</p>
            </Link>
          );
        }
        
      })}
    </>
  );
}