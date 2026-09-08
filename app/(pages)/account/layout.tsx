import TopNav from '../../components/ui/topnav';
import NavLinks from '../../components/ui/account/navLinks';
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="w-full h-min">
        <TopNav>
          <NavLinks />
        </TopNav>
      </div>
      <div className="flex w-full h-full -mt-3 pt-2.25 mb-3.5 z-0">{children}</div>
    </div>
  );
}