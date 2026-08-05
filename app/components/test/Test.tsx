'use client';

import { buildClientPayload } from '@/client/fraud/clientData';

export default function Test() {

  const handleClick = async () => {
    const clientData = await buildClientPayload();
    const res = await fetch('/api/hmrc/fraud/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData),
    });

    try{
      // const data = await res.json();
      console.log(res);
    }catch(error){
      console.error(error);
    }
  };

  return (
    <button onClick={handleClick} className="bg-black text-white p-3 rounded-full cursor-pointer">
      Run Test
    </button>
  );
}