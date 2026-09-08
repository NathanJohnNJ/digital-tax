import BusinessDetails from '@/app/components/ui/account/BusinessDetails';
import Obligations from '@/app/components/ui/account/Obligations';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}){
  const { nino, businessId, businessName } = (await searchParams);
  

  return (
    <div className="p-3 bg-sky-75 w-[99%] h-full border-2 -z-50 border-blue-500 rounded-2xl transition-all duration-75">
      <div className="w-full h-full rounded-2xl bg-white p-6 flex flex-col overflow-y-scroll scrollbar-none">
        <div className="flex flex-col justify-start items-center w-full h-full">
          <h1 className="text-4xl font-extrabold text-gray-900 mt-6">Business Overview</h1>
          <h2 className="text-3xl font-extrabold text-gray-900">{businessName}</h2>
        </div>
        <div className="grid mt-4 grid-cols-6 grid-rows-2">
          <div className="row-start-1 col-start-1 col-span-3">
            <BusinessDetails nino={nino} businessId={businessId}/>
          </div>
          <div className="row-start-1 col-start-4 col-span-3">
            <Obligations nino={nino} businessId={businessId} />
          </div>
        </div>
      </div>
    </div>
  )
}