function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDisplayDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";

  return `${day}${suffix} ${months[month - 1]} ${year}`;
}

function getUkDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function taxYearStartYear(date: Date): number {
  const { year, month, day } = getUkDateParts(date);
  const isOnOrAfterTaxYearStart = month > 4 || (month === 4 && day >= 6);

  return isOnOrAfterTaxYearStart ? year : year - 1;
}

function getTaxYearStartYear(taxYear?: string): number {
  if (taxYear === undefined) {
    return taxYearStartYear(new Date());
  }

  const match = /^(\d{4})-(\d{2})$/.exec(taxYear);
  const startYear = match ? Number(match[1]) : NaN;
  const endYear = match ? Number(`20${match[2]}`) : NaN;

  if (!match || endYear !== startYear + 1) {
    throw new Error(`Invalid tax year: ${taxYear}. Expected format YYYY-YY.`);
  }

  return startYear;
}

export function getFromDate(taxYear?: string): string {
  return formatDate(getTaxYearStartYear(taxYear), 4, 6);
}

export function getToDate(taxYear?: string): string {
  return formatDate(getTaxYearStartYear(taxYear) + 1, 4, 5);
}