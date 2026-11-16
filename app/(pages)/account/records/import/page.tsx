import RecordCsvImport from '@/app/components/ui/account/RecordCsvImport';

export default function Page() {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border-2 border-blue-500 bg-sky-75 p-2 sm:p-3">
      <div className="rounded-2xl bg-white p-3 sm:p-6">
        <RecordCsvImport />
      </div>
    </div>
  );
}
