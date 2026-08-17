'use client';

import {
  HomeIcon,
  DocumentCurrencyPoundIcon,
  CalendarDaysIcon,
  SquaresPlusIcon
} from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';

const links = [
  { name: 'Account Home', href: '/account', icon: HomeIcon },
  { name: 'Income/Expendature', href: '/account/income', icon: DocumentCurrencyPoundIcon },
  { name: 'Quarterly Updates', href: '/account/quarterly', icon: SquaresPlusIcon },
  { name: 'End of Year Tax Return', href: '/account/taxReturn', icon: CalendarDaysIcon }
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-12 grow items-center justify-center gap-2 rounded-t-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-50 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3 z-0',
              {
                'bg-sky-50 text-blue-600 border-t-2 border-l-2 border-r-2 border-b-sky-50 border-b-2 z-50 -mb-3': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}