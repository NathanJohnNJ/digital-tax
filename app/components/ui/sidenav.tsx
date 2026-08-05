import Link from 'next/link';
import NavLinks from './navlinks';
import Image from 'next/image';

export default function SideNav() {
  return (
    <div className="flex h-full flex-col py-4 w-min">
      <Link className="mb-2 flex items-center justify-center rounded-md bg-linear-300 from-zinc-400/70 to-white p-2" href="/">
        <div className="w-40 flex items-center justify-center">
          <Image src="/images/roundLogo.png" width="150" height="150" alt="NJTD Logo" className="flex self-center justify-self-center" loading="eager" />
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
      </div>
    </div>
  );
}