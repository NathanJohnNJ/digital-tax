
import AnnualSummary from '@/app/components/ui/account/taxReturn/AnnualSummary';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { nino, businessId, startDate, endDate } = await searchParams;
  const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

  return (
    <div className="min-w-0 flex-1 p-2 sm:p-3 bg-sky-75 border-2 border-blue-500 rounded-2xl">
      <div className="w-full rounded-2xl bg-white p-3 sm:p-6 flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-6 text-center">End of year tax return</h1>
        <AnnualSummary
          nino={firstValue(nino)}
          businessId={firstValue(businessId)}
          startDate={firstValue(startDate)}
          endDate={firstValue(endDate)}
        />
      </div>
    </div>
  )
}