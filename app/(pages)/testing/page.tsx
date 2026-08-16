import CreateTestUser from '@/app/components/test/createTestUser';
import GetServices from '@/app/components/test/getServices';
import Test from '@/app/components/test/Test';

export default async function Page(){

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-amber-50 w-full h-full border-2 border-amber-500 rounded-2xl transition-all duration-75 text-slate-700">
    <div className="flex flex-col items-center p-8 w-full h-full bg-white overflow-y-scroll rounded-xl shadow-2xl">
      <h2 className="font-extrabold text-5xl">Testing Resources</h2>
      <div className="flex mt-6 p-6 h-full w-full items-center justify-center">
        <GetServices />
        <CreateTestUser />
        <Test />
      </div>
    </div>
  </div>

  )
}