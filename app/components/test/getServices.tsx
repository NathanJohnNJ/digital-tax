'use client';
import { useState } from 'react';
import { getServicesAction } from '@/app/actions/getServicesAction';

export default function GetServices() {
  const [ services, setServices ] = useState<{key:string, name:string, allowedUserTypes:string[]}[] | null>(null);

  async function clickHandler(){
    const response = await getServicesAction();
    setServices(response);
  }

  return (
    <>
      <button onClick={clickHandler} className="bg-linear-to-tr from-amber-700 to-amber-200 to-80% hover:to-100% text-white p-3 rounded-full cursor-pointer">
        Get Services List
      </button>
      {services &&
      <div className="transition-all duration-150 border-2 border-amber-700 rounded-2xl p-6 m-4 overflow-y-scroll max-h-100">
        <ul className="flex flex-col mb-4 list-disc">
          { services.map((service, i) => {
            return (
              <li className="m-2" key={i}>
                <div className="mr-2 flex flex-col">
                <p><strong>Key:</strong> {service.key}</p>
                <p><strong>Allowed User Types:</strong></p>
                <ul>{
                  service.allowedUserTypes.map((type, i) =>{
                    return(
                      <li className="">{type}</li>
                    )
                  })
                }</ul>
                </div>
              </li>
            )
          })
          }
        </ul>
      </div>
      }
    </>
  );
}