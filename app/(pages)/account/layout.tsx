import TopNav from '../../components/ui/topnav';
import NavLinks from '../../components/ui/account/navLinks';
import clsx from 'clsx';
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="w-full h-min">
        <TopNav>
          <NavLinks />
        </TopNav>
      </div>
      <div className="flex w-full h-full border-2 border-blue-500 -mt-0.75 z-0">{children}</div>
    </div>
  );
}