
import Image from 'next/image';

export default async function Home() {

  return (
    <div className="flex flex-col justify-start items-center w-full p-3 h-full border-green-700 bg-green-50 border-2 transition-all duration-75 rounded-2xl">
      <div className="bg-white rounded-xl overflow-y-scroll flex flex-col justify-start items-center">
        <Image src="/images/rectWithNJTD.png" width="600" height="152" alt="Digital Tax logo." loading="eager" />
        <div className="flex flex-col items-center justify-center p-6">
          <h1 className="text-4xl font-semibold text-center text-stone-700 py-4 px-8 mx-24">Making the transition of Making Tax Digital with HMRC easier with quarterly updates and year-end tax returns.</h1>

          {/* Skeleton placeholder */}
          <div className="w-full flex flex-col justify-center items-center mt-8">
            <div className="w-3/4 flex mt-6">
              <div className="flex w-3/8 h-full justify-center">
                <div className="h-44 w-1/2 bg-linear-to-tr from-neutral-400/70 to-neutral-50 border-gray-400/70 border-2 rounded-2xl "></div>
              </div>
              <div className="flex flex-col space-y-1 w-5/8 justify-center items-center">
                <div className="h-10 w-full rounded-lg bg-linear-to-l from-slate-300/70 to-slate-500/50 mt-4" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
              </div>
            </div>
            <div className="w-3/4 flex space-y-3 mt-10">
              <div className="flex flex-col space-y-1 w-5/8 justify-center items-center">
                <div className="h-10 w-full rounded-lg bg-linear-to-l from-slate-300/70 to-slate-500/50 mt-4" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
              </div>
              <div className="flex w-3/8 h-full justify-center">
                <div className="h-44 w-1/2 bg-linear-to-tr from-neutral-400/70 to-neutral-50 border-gray-400/70 border-2 rounded-2xl "></div>
              </div>
            </div>
            <div className="w-3/4 flex mt-12">
              <div className="flex flex-col space-y-1 w-5/8 justify-center items-center">
                <div className="h-10 w-full rounded-lg bg-linear-to-l from-slate-300/70 to-slate-500/50 mt-4" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
              </div>
              <div className="flex w-3/4 h-full justify-center">
                <div className="h-44 w-1/2 bg-linear-to-tr from-neutral-400/70 to-neutral-50 border-gray-400/70 border-2 rounded-2xl "></div>
              </div>
              <div className="flex flex-col space-y-1 w-5/8 justify-center items-center">
                <div className="h-10 w-full rounded-lg bg-linear-to-l from-slate-300/70 to-slate-500/50 mt-4" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
                <div className="h-6 w-full rounded bg-linear-to-l from-slate-300/70 to-slate-500/50" />
              </div>
            </div>
          </div>
          {/* End of skeleton placeholder */}


          <h2 className="flex text-3xl font-bold text-center text-stone-700 mt-20">Brought to you by&nbsp;<a href="https://njtd.xyz" target="_blank" rel="noreferrer" className="hover:underline text-stone-500 hover:text-stone-600">NJTD</a></h2>
        </div>
      </div>
    </div>
  )
}
