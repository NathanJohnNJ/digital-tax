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

export default function NavLinks({ canAccessTesting = false }: { canAccessTesting?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex flex-col gap-2">
        <Link key="Home" href="/" aria-label="Home"
        className={clsx(
          'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-green-50 hover:text-green-700',
          {
            'bg-green-50 text-green-700 border-t-2 border-l-2 border-r-0 border-b-2 border-green-700 -mr-0.5': pathname === "/"
          },
        )}>
          <HomeIcon className="w-5 shrink-0 md:w-6" />
          <p className="hidden md:block">Home</p>
        </Link>
        
        <Link key="Account" href="/account" aria-label="Account"
          className={clsx(
          'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-sky-50 hover:text-blue-600',
          {
            'bg-sky-50 text-blue-600 border-t-2 border-l-2 border-r-0 border-b-2 border-blue-500 -mr-0.5': pathname.split("/")[1].includes('account'),
          },
        )}>
          <UserIcon className="w-5 shrink-0 md:w-6" />
          <p className="hidden md:block">Account</p>
        </Link>
        <Link key="Documentation" href='/docs' aria-label="Documentation"
        className={clsx(
          'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-mauve-100 hover:text-mauve-700',
          {
            'bg-mauve-100 text-mauve-700 border-t-2 border-l-2 border-r-0 border-b-2 border-mauve-700 -mr-0.5': pathname.split("/")[1].includes("docs")
          },
        )}>
          <DocumentIcon className="w-5 shrink-0 md:w-6" />
          <p className="hidden md:block">Documentation</p>
        </Link>
        {canAccessTesting && (
          <Link key="Testing" href="/testing" aria-label="Testing"
            className={clsx(
            'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-amber-50 hover:text-amber-700',
            {
              'bg-amber-50 text-amber-700 border-t-2 border-l-2 border-r-0 border-b-2 border-amber-500 -mr-0.5': pathname === '/testing'
            },
          )}>
            <ClipboardDocumentCheckIcon className="w-5 shrink-0 md:w-6" />
            <p className="hidden md:block">Testing</p>
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Link key="Cookies" href="/cookies" aria-label="Cookies Policy"
        className={clsx(
          'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-taupe-50 hover:text-taupe-500',
          {
            'bg-taupe-50 text-taupe-500 border-t-2 border-l-2 border-r-0 border-b-2 border-taupe-500 -mr-0.5': pathname === "/cookies",
          },
        )}>
          <DocumentIcon className="w-5 shrink-0 md:w-6" />
          <p className="hidden md:block">Cookies Policy</p>
        </Link>
        <Link key="Privacy" href="/privacy" aria-label="Privacy Policy"
        className={clsx(
          'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-neutral-50 hover:text-neutral-500',
          {
            'bg-neutral-50 text-neutral-500 border-t-2 border-l-2 border-r-0 border-b-2 border-neutral-500 -mr-0.5': pathname === "/privacy",
          },
        )}>
          <DocumentIcon className="w-5 shrink-0 md:w-6" />
          <p className="hidden md:block">Privacy Policy</p>
        </Link>
        <Link key="Terms" href="/terms" aria-label="Terms & Conditions"
        className={clsx(
          'z-10 flex h-12 w-full self-end items-center gap-2 rounded-l-md bg-gray-50 p-3 text-sm font-medium hover:border-t-2 hover:border-l-2 hover:border-r-0 hover:border-b-2 hover:bg-slate-50 hover:text-slate-500',
          {
            'bg-slate-50 text-slate-500 border-t-2 border-l-2 border-r-0 border-b-2 border-slate-500 -mr-0.5': pathname === "/terms",
          },
        )}>
          <DocumentIcon className="w-5 shrink-0 md:w-6" />
          <p className="hidden md:block">Terms & Conditions</p>
        </Link>
        
      </div>
    </div>
  );
}