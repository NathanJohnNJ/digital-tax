'use client';
import { ReactElement, useState } from "react";
import YearEnd from './obligations/YearEnd';
import Quarterly from './obligations/Quarterly';

export default function Obligations(props: any){
  const { businessId, nino } = props;
  const [ year, setYear ] = useState("2018-19")

  const options: Array<ReactElement> = [];
  const thisYear = new Date().getFullYear();
  for(let year = 2018; year <= thisYear; year++){
    const taxYear = `${year}-${String(year + 1).slice(-2)}`
    options.push(<option key={year} className="" value={taxYear}>{taxYear}</option>)
  }
  
  return (
    <div className="border-2 border-blue-400 shadow-2xl rounded-2xl p-4 mt-6 flex flex-col justify-self-start bg-linear-to-tr from-gray-200 to-40% to-gray-50">
      <h3 className="font-extrabold text-2xl text-center mb-2">Obligations</h3>
      <label className="flex items-center" htmlFor="taxYear">
        Please select a tax year to see your obligations:
        <select id="taxYear" name="taxYear" className="w-fit flex rounded-2xl border p-1 ml-3" onChange={(e) => setYear(e.target.value)}>
          {options}
        </select>
      </label>
      <div className="flex flex-col mt-4 items-start justify-start">
        <h4 className="text-2xl font-bold -mb-4">Quarterly Obligations</h4>
        <Quarterly businessId={businessId} nino={nino} year={year}/>
      </div>
      <div className="">
        <h4 className="text-2xl font-bold -mb-4">Year End Obligations</h4>
        <YearEnd businessId={businessId} nino={nino} year={year}/>
      </div>
    </div>
  )
}