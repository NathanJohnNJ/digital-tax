'use client';

import {
  UserIcon,
  HomeIcon,
  DocumentIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

const links = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Account', href: '/account', icon: UserIcon },
  { name: 'Documentation', href: '/docs', icon: DocumentIcon },
];

export default function NavLinks({ canAccessTesting = false }: { canAccessTesting?: boolean }) {
  const pathname = usePathname();
  const isTestingAllowed = canAccessTesting;

  return (
    <div className="flex flex-col gap-y-2 h-full justify-between">
      <div className="flex flex-col gap-y-2">
        <Link key="Home" href="/"
        className={clsx(
          'flex h-12 grow items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:bg-green-50 hover:text-green-700 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-green-50 text-green-700 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname === "/"
          },
        )}>
          <HomeIcon className="w-6" />
          <p className="hidden md:block">Home</p>
        </Link>
        
        <Link key="Account" href="/account"
          className={clsx(
          'flex h-12 grow items-center gap-2 rounded-l-md p-3 bg-gray-50 text-sm font-medium hover:bg-sky-50 hover:text-blue-600 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-sky-50 text-blue-600 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname.split("/")[1].includes('account'),
          },
        )}>
          <UserIcon className="w-6" />
          <p className="hidden md:block">Account</p>
        </Link>
        <Link key="Documentation" href='/docs'
        className={clsx(
          'flex h-12 grow items-center gap-2 rounded-l-md p-3 bg-gray-50 text-sm font-medium hover:bg-mauve-100 hover:text-mauve-700 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-mauve-100 text-mauve-700 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname.split("/")[1].includes("docs")
          },
        )}>
          <DocumentIcon className="w-6" />
          <p className="hidden md:block">Documentation</p>
        </Link>
        <Link key="Testing" href="/testing"
          className={clsx(
          'flex h-12 grow items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:bg-amber-50 hover:text-amber-700 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-amber-50 text-amber-700 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname === '/testing'
          },
        )}>
          <ClipboardDocumentCheckIcon className="w-6" />
          <p className="hidden md:block">Testing</p>
        </Link>
      </div>
      <div className="flex flex-col gap-y-2">
        <Link key="Cookies" href="/cookies"
        className={clsx(
          'flex self-end w-full h-12 grow items-center gap-2 bg-gray-50 rounded-l-md p-3 text-sm font-medium hover:bg-taupe-50 hover:text-taupe-500 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-taupe-50 text-taupe-500 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname === "/cookies",
          },
        )}>
          <DocumentIcon className="w-6" />
          <p className="block w-full">Cookies Policy</p>
        </Link>
        <Link key="Privacy" href="/privacy"
        className={clsx(
          'flex self-end w-full h-12 grow items-center gap-2 bg-gray-50 rounded-l-md p-3 text-sm font-medium hover:bg-neutral-50 hover:text-neutral-500 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-neutral-50 text-neutral-500 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname === "/privacy",
          },
        )}>
          <DocumentIcon className="w-6" />
          <p className="block w-full">Privacy Policy</p>
        </Link>
        <Link key="Terms" href="/terms"
        className={clsx(
          'flex self-end h-12 grow items-center gap-2 bg-gray-50 rounded-l-md p-3 text-sm font-medium hover:bg-slate-50 hover:text-slate-500 md:flex-none z-50 hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2',
          {
            'bg-slate-50 text-slate-500 border-t-2 border-l-2 border-r-0 border-b-2 -mr-0.5': pathname === "/terms",
          },
        )}>
          <DocumentIcon className="w-6" />
          <p className="block">Terms & Conditions</p>
        </Link>
        
      </div>
    </div>
  );
}