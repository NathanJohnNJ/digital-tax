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
      const data = await res.json();
      console.log(res);
    }catch(error){
      console.error(error);
    }
  };

  return (
    <button onClick={handleClick} className="bg-linear-to-tr from-amber-700 to-amber-200 to-80% hover:to-100% text-white p-3 rounded-full cursor-pointer m-10">
      Test FPHeaders
    </button>
  );
}