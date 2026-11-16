import { Suspense } from 'react';
import TopNav from '../../components/ui/topnav';
import NavLinks from '../../components/ui/account/navLinks';
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center w-full">
      <div className="w-full">
        <TopNav>
          <Suspense fallback={<div className="h-12" aria-hidden="true" />}>
            <NavLinks />
          </Suspense>
        </TopNav>
      </div>
      <div className="relative -mt-0.5 flex min-w-0 flex-1 w-full">{children}</div>
    </div>
  );
}