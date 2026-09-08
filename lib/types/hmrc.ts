export type HMRCProps = {
  accessToken?: string
}

export type BusinessDetails = {
  businessId: string
  typeOfBusiness: string
  tradingType: string
  tradingName: string
  accountingPeriods: {
    start: string
    end: string
  }[]
  commencementDate: string
  cessationDate: string
  businessAddressLineOne: string
  businessAddressLineTwo: string
  businessAddressLineThree: string
  businessAddressLineFour: string
  businessAddressPostcode: string
  businessAddressCountryCode: string
  firstAccountingPeriodStartDate: string
  firstAccountingPeriodEndDate: string
  latencyDetails: {
    latencyEndDate: string
    taxYear1: string
    latencyIndicator1: string
    taxYear2: string
    latencyIndicator2: string
  }
  yearOfMigration: string
  quarterlyTypeChoice: {
    quarterlyPeriodType: string
    taxYearOfChoice: string
  }
}

export type Obligation = {
  periodStartDate: string
  periodEndDate: string
  dueDate: string
  status: string
  receivedDate?: string
}

export type Obligations = {
  obligations: Obligation[]
}

export type QuarterlyObligations = {
  obligations: QuarterlyObligation[]
}

export type QuarterlyObligation = {
  typeOfBusiness: string
  businessId: string
  obligationDetails: Obligation[]
}

