'use client';
import { useState } from 'react';

export default function CreateTestUser() {
  const [ selected, setSelected ] = useState<string[]>([]);
  const [ testUser, setTestUser ] = useState<any | null>(null);

  function handleSelect(checked:boolean, name:string) {
    if (checked) {
      setSelected([...selected, name]);
    } else {
      setSelected(selected.filter((item) => item !== name));
    }
  };

  const serviceNames = ['national-insurance', 'self-assessment', 'mtd-income-tax', 'mtd-vat', ]

  async function clickHandle(){
    console.log(selected);
    const response = await fetch(`http://localhost:3000/api/hmrc/applicationRestrictedAuth/createTestUser`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(selected)
    })
    const data = await response.json();
    console.log(data);
    setTestUser(data);
    setSelected([]);
  }

  const handleDownload = () => {
    const json = JSON.stringify(testUser, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testUser.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="m-10 p-10">
      <form name="createUserForm" action={clickHandle} className="flex flex-col mb-4 relative border-2 border-amber-500 p-6 rounded-2xl">
        { serviceNames.map((service, i) => {
          return (
            <label htmlFor={service} className="m-2 hover:font-semibold" key={i}>
              <input name={service} type="checkbox" checked={selected.includes(service)} onChange={()=>{handleSelect(!selected.includes(service), service)}} className="mr-2" />
              {service}
            </label>
          )
        })
        }
        <button type="submit" className="bg-linear-to-tr from-amber-700 to-amber-200 to-80% hover:to-100% text-white p-3 rounded-full cursor-pointer absolute -bottom-7 left-5 right-5">
          Create Test User
        </button>
      </form>
      { testUser &&
        <div className="flex flex-col mt-12">
          <p>Test user has been created. See details below:</p>
          <ul className="overflow-y-scroll border-2 border-amber-500 p-6 rounded-2xl m-4">
            <li className="flex"><strong>User ID: </strong><span>{testUser.userId}</span></li>
            <li className="flex"><strong>Password: </strong><span>{testUser.password}</span></li>
            <li className="flex"><strong>Full Name: </strong><span>{testUser.userFullName}</span></li>
            <li className="flex"><strong>Email: </strong><span>{testUser.emailAddress}</span></li>
            <li className="flex"><strong>D.O.B: </strong><span>{testUser.individualDetails.dateOfBirth}</span></li>
            <li className="flex"><strong>Address: </strong><div className="flex flex-col items-start"><span>{testUser.individualDetails.address.line1}</span><span>{testUser.individualDetails.address.line2}</span><span>{testUser.individualDetails.address.postcode}</span></div></li>
            { testUser.saUtr && <li className="flex"><strong>Self-Assessment UTR: </strong><span>{testUser.saUtr}</span></li> }
            { testUser.nino && <li className="flex"><strong>NI Number: </strong><span>{testUser.nino}</span></li> }
            { testUser.mtdItId && <li className="flex"><strong>MTD Income Tax ID: </strong><span>{testUser.mtdItId}</span></li> }
            { testUser.eoriNumber && <li className="flex"><strong>EORI Number: </strong><span>{testUser.eoriNumber}</span></li> }
            { testUser.vrn && <li className="flex"><strong>VAT Ref: </strong><span>{testUser.vrn}</span></li> }
            { testUser.vatRegistrationDate && <li className="flex"><strong>VAT Registration Date: </strong><span>{testUser.vatRegistrationDate}</span></li> }
          </ul>
          <button
            onClick={handleDownload}
            className="py-2 px-3 flex self-center w-fit rounded-full bg-linear-to-tr from-blue-700 to-blue-200 to-80% hover:to-100% text-white "
          >
            Download Test User JSON
          </button>
        </div>
      }
    </div>
  );
}