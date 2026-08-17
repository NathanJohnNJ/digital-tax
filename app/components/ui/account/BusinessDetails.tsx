'use client';
import { useEffect, useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

export default function BusinessDetails(props: any){
  const { business, nino } = props;
  const [ businessDetails, setBusinessDetails ] = useState(null);
  const [ clientData, setClientData ] = useState();

  useEffect(() => {
    async function getDetails(clientData: any){
      const req = await fetch(`/api/hmrc/userRestrictedAuth/businessDetails`, {
        method: 'POST',
        body: JSON.stringify({
          nino: nino,
          businessID: business.businessId,
          clientData: clientData
        })
      })
      const response = await req.json();
      return response;
    }
    async function callFunction(){
      const clientData = await buildClientPayload();
      const details = await getDetails(clientData);
      setBusinessDetails(details);
    }
    callFunction();
  }, [])
  return(
    <div className="border-2 border-blue-300 p-6 m-4">
      This will have all business information and buttons to action certain tasks
    </div>
  )
}