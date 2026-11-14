import RecordCsvImport from '@/app/components/ui/account/RecordCsvImport';

export default function Page() {
  return (
    <div className="w-[99%] h-full rounded-2xl border-2 border-blue-500 bg-sky-75 p-3">
      <div className="h-full overflow-y-auto rounded-2xl bg-white p-6">
        <RecordCsvImport />
      </div>
    </div>
  );
}
