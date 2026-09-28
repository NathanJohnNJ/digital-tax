import QuarterlyUpdates from '@/app/components/ui/account/updates/QuarterlyUpdates';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { nino, businessId, startDate, endDate } = (await searchParams);
  const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

  return (
    <div className="p-3 bg-sky-75 w-[99%] h-full border-2 -z-50 border-blue-500 rounded-2xl transition-all duration-75">
      <div className="w-full h-full rounded-2xl bg-white p-6 flex flex-col overflow-y-scroll scrollbar-none">
        <h1 className="text-4xl font-extrabold text-gray-900 mt-6 text-center">Quarterly Updates</h1>
        <QuarterlyUpdates
          nino={firstValue(nino)}
          businessId={firstValue(businessId)}
          startDate={firstValue(startDate)}
          endDate={firstValue(endDate)}
        />
      </div>
    </div>
  )
}