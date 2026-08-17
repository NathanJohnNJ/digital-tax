'use client';
import { useState } from 'react';
import { getServicesAction, type ServiceItem } from '@/app/actions/getServicesAction';

export default function GetServices() {
  const [ services, setServices ] = useState<ServiceItem[] | null>(null);
  const [ error, setError ] = useState<string | null>(null);

  async function clickHandler(){
    const result = await getServicesAction();

    if (!result.ok) {
      setServices(null);
      setError(result.error);
      return;
    }

    setError(null);
    setServices(result.services);
  }

  return (
    <>
      <button onClick={clickHandler} className="bg-linear-to-tr from-amber-700 to-amber-200 to-80% hover:to-100% text-white p-3 rounded-full cursor-pointer">
        Get Services List
      </button>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
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
                      <li className="" key={`${service.key}-${type}-${i}`}>{type}</li>
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