'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Cookie, CircleX } from 'lucide-react';
import Link from 'next/link';

export default function Cookies(){
  const [ visible, setVisible ] = useState(true);
  const [ selected, setSelected ] = useState<string[]>(['essential']);
  const { user } = useUser();

  function getCookie(name: string): string | null {
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      const [key, value] = cookie.split('=');
      if (key === name) return decodeURIComponent(value);
    }
    return null;
  }
  

  useEffect(()=>{
    const hasVisited = getCookie('visited');
    if(!hasVisited){
      setVisible(true);
      document.cookie = 'visited=true; Path=/; SameSite=Lax'
    } else {
      setVisible(false);
    }
    if (!user) return;
    async function getCookieData(){ 
      try{
        const cookiesResponse = await fetch(`/api/cookies?id=${user!.sub}`, {
          method: 'GET',
        })
        return cookiesResponse;
      } catch(error){
        console.log(error);
      }
    }
    getCookieData();
  }, []);

  function handleSelect(checked:boolean, name:string) {
    if (checked) {
      setSelected([...selected, name]);
    } else {
      setSelected(selected.filter((item) => item !== name));
    }
  };
  function selectAll(value:number) {
    if(value !== 2){
      setSelected(['analytics', 'essential']);
    }else{
      setSelected([]);
    }
  };
  async function addCookiesPreferences(){
    if (!user) return;
    try{
      const cookiesResponse = await fetch(`/api/cookies?id=${user!.sub}`, {
        method: 'POST',
        body: JSON.stringify({selected})
      })
      return cookiesResponse;
    } catch(error){
      console.log(error);
    }
  }
  async function closeHandler(){
    await addCookiesPreferences();
    setVisible(false);
  }

  return (
    <>
      { visible ?
        <div className="w-fit h-fit flex flex-col items-center justify-center absolute bottom-10 right-10 border border-slate-600/80 bg-linear-60 from-slate-500/90 to-slate-300/90 to-85% text-neutral-800 rounded-2xl px-6 py-2 transition-all duration-75">
          <div className="flex w-full">
            <h2 className="w-full mb-3 font-light text-lg text-nowrap">Please select your cookie options:</h2>
            <div className="flex items-center justify-end w-full" onClick={closeHandler}><CircleX className="h-5 w-5 -mr-4 -mt-6 text-slate-700 hover:text-slate-500 hover:scale-110 transition-all duration-75" /></div>
          </div>
          <ul className="flex">
            <li>
            <label htmlFor="essential" className="checkbox-container">Essential Cookies
              <input type="checkbox" className="appearence-none rounded-full" id="essential" name="essential" checked={selected.includes('essential')} onChange={()=>{handleSelect(!selected.includes('essential'), 'essential')}} />
              <span className="checkmark"></span>
              </label>
            </li>
            <li>
              <label htmlFor="analytics" className="checkbox-container">Analytic Cookies
              <input type="checkbox" id="analytics" name="analytics" checked={selected.includes('analytics')} onChange={()=>{handleSelect(!selected.includes('analytics'), 'analytics')}} />
              <span className="checkmark"></span>
              </label>
            </li>
            <li>
              <label htmlFor="all" className="checkbox-container">All Cookies
              <input type="checkbox" id="all" name="all" checked={selected.length === 2} onChange={()=>{selectAll(selected.length)}} />
              <span className="checkmark"></span>
              </label>
            </li>
          </ul>
          <p className="mt-3">For more information regarding the cookies we use, please see our <Link href="https://dt.njtd.xyz/cookies" className="cursor-pointer font-semibold text-slate-800 hover:underline hover:decoration-double hover:font-bold hover:text-neutral-600">Cookie Policy</Link>.</p>
        </div>
        :
        <button className="absolute bottom-10 right-15 flex items-center justify-center w-fit h-fit bg-linear-60 from-slate-500/90 to-slate-400/90 transition-all duration-75 p-2 rounded-full cursor-pointer" onClick={()=>{setVisible(true)}}><Cookie /></button>
      }
    </>
  )
}