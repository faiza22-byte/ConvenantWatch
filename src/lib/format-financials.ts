const CURRENCY_KEYS = new Set([
  "revenue",
  "netIncome",
  "operatingIncome",
  "interestExpense",
  "incomeTaxExpense",
  "depreciation",
  "amortization",
  "ebitda",
  "currentAssets",
  "currentLiabilities",
  "totalAssets",
  "totalLiabilities",
  "totalEquity",
  "cash",
  "longTermDebt",
  "shortTermDebt",
  "totalDebt",
  "rentAndLease",
  "principalPayments",
]);

const RATIO_KEYS = new Set([
  "leverageRatio",
  "interestCoverageRatio",
  "currentRatio",
  "fixedChargeCoverage",
  "debtToEquity",
  "debtServiceCoverage",
]);

export function labelizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function formatFinancialValue(key: string, value: number): string {
  if (RATIO_KEYS.has(key)) {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })}x`;
  }
  if (CURRENCY_KEYS.has(key) || typeof value === "number") {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
    return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return String(value);
}
