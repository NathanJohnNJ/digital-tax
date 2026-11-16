'use client';
import { useUser } from '@auth0/nextjs-auth0/client';
import LogoutButton from '../../../components/auth/LogoutButton';
import {
  HomeIcon,
  DocumentCurrencyPoundIcon,
  CalendarDaysIcon,
  SquaresPlusIcon,
  BriefcaseIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';

const links = [
  { name: 'Account Home', href: '/account', icon: HomeIcon },
  { name: 'Business Overview', href: '/account/business-overview', icon: BriefcaseIcon},
  { name: 'Income/Expendature', href: '/account/income', icon: DocumentCurrencyPoundIcon },
  { name: 'Import records', href: '/account/records/import', icon: ArrowUpTrayIcon },
  { name: 'Quarterly Updates', href: '/account/quarterly', icon: SquaresPlusIcon },
  { name: 'End of Year Tax Return', href: '/account/taxReturn', icon: CalendarDaysIcon }
];

export default function NavLinks() {
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const href = queryString ? `${link.href}?${queryString}` : link.href;
        return (
          <Link
            key={link.name}
            href={href}
            aria-label={link.name}
            className={clsx(
              'flex h-12 w-10 flex-none items-center justify-center gap-2 rounded-t-md bg-gray-50 p-2 text-sm font-medium hover:bg-sky-50 hover:text-blue-600 sm:w-12 md:w-auto md:justify-start md:px-3',
              {
                'bg-sky-50 text-blue-600 border-t-2 border-l-2 border-r-2 border-blue-500 border-b-2 border-b-sky-50 z-1': pathname === link.href,
              },
              {
                'rounded-tl-md': link.href !== '/account',
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
      {user &&
      <div className="ml-auto flex items-center">
        <LogoutButton style={{borderBottomRightRadius: 0}} />
      </div>
      }
    </>
  );
}