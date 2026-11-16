import BusinessDetails from '@/app/components/ui/account/BusinessDetails';
import Obligations from '@/app/components/ui/account/Obligations';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}){
  const { nino, businessId, businessName } = (await searchParams);
  

  return (
    <div className="min-w-0 flex-1 p-2 sm:p-3 bg-sky-75 border-2 border-blue-500 rounded-2xl">
      <div className="w-full rounded-2xl bg-white p-3 sm:p-6 flex flex-col">
        <div className="flex flex-col justify-start items-center w-full text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-6">Business Overview</h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 break-words max-w-full">{businessName}</h2>
        </div>
        <div className="grid min-w-0 mt-4 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <BusinessDetails nino={nino} businessId={businessId}/>
          </div>
          <div className="min-w-0">
            <Obligations nino={nino} businessId={businessId} />
          </div>
        </div>
      </div>
    </div>
  )
}