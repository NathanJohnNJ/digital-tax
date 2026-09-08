'use client';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs(){
  const pathname = usePathname();
  const pathArray = pathname.split("/");
  let href="/";
  return (
    <div className="flex gap-x-2">
      { pathArray.map((path, i) => {
        for (let j=i; j>0; j--){
          href = href.concat(`${path}/`)
          return (
            <div className="flex gap-x-2" key={i}>
              <span className="text-sm flex items-center">{i === 1 ? '' : '>'}</span>
              <Link href={href} className={clsx(" text-slate-600 hover:text-slate-500 hover:font-bold",
                {
                  'font-extrabold underline' : j === pathArray.length-1
                }
              )}>
                {path.split("-").join(" ")}
              </Link>
            </div>
          )
        }
      })}
    </div>
  )
}