function parseAmount(raw) {
  if (raw == null) return 0;
  let cleaned = String(raw).trim().replace(/,/g, "").replace(/\$/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "—") return 0;
  const negative = cleaned.startsWith("(") && cleaned.endsWith(")");
  if (negative) cleaned = cleaned.slice(1, -1);
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return negative ? -value : value;
}

function walkRows(node, out) {
  if (!node || typeof node !== "object") return;

  let rows = node.Row;
  if (rows == null) return;
  if (!Array.isArray(rows)) rows = [rows];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    const header = row.Header;
    if (header?.ColData) {
      const label = String(header.ColData[0]?.value ?? "").trim();
      const amount = parseAmount(header.ColData.at(-1)?.value);
      if (label) out[label.toLowerCase()] = amount;
    }

    const summary = row.Summary;
    if (summary?.ColData) {
      const label = String(summary.ColData[0]?.value ?? "").trim();
      const amount = parseAmount(summary.ColData.at(-1)?.value);
      if (label) out[label.toLowerCase()] = amount;
    }

    if (row.ColData?.length >= 2) {
      const label = String(row.ColData[0]?.value ?? "").trim();
      const amount = parseAmount(row.ColData.at(-1)?.value);
      if (label && label.toLowerCase() !== "total") {
        out[label.toLowerCase()] = amount;
      }
    }

    if (row.Rows) walkRows(row.Rows, out);
  }
}

export function flattenReport(report) {
  const lines = {};
  walkRows(report?.Rows ?? {}, lines);
  return lines;
}

function findLine(lines, ...patterns) {
  // First pass: try exact matches
  for (const pattern of patterns) {
    const pat = pattern.toLowerCase();
    for (const [label, amount] of Object.entries(lines)) {
      if (label === pat) return amount;
    }
  }
  
  // Second pass: try prefix matches (avoid matching compound labels like "total liabilities and equity" when searching for "total liabilities")
  for (const pattern of patterns) {
    const pat = pattern.toLowerCase();
    let bestMatch = null;
    let bestLength = -1;
    for (const [label, amount] of Object.entries(lines)) {
      if (label.includes(pat)) {
        // Prefer shorter matches (more specific)
        // For "total liabilities", prefer "total liabilities" over "total liabilities and equity"
        if (bestMatch === null || label.length < bestLength) {
          bestMatch = amount;
          bestLength = label.length;
        }
      }
    }
    if (bestMatch !== null) return bestMatch;
  }
  
  return 0;
}

function sumMatching(lines, ...patterns) {
  let total = 0;
  const used = new Set();
  for (const pattern of patterns) {
    const pat = pattern.toLowerCase();
    for (const [label, amount] of Object.entries(lines)) {
      if (label.includes(pat) && !used.has(label)) {
        total += amount;
        used.add(label);
      }
    }
  }
  return total;
}

export function extractCovenantMetrics(profitAndLoss, balanceSheet, cashFlow = null) {
  const pl = flattenReport(profitAndLoss);
  const bs = flattenReport(balanceSheet);
  const cf = cashFlow ? flattenReport(cashFlow) : {};

  const netIncome = findLine(pl, "net income", "net operating income", "net earnings");
  const interestExpense = Math.abs(
    findLine(pl, "interest expense", "interest paid", "finance costs", "bank charges"),
  );
  const incomeTax = Math.abs(findLine(pl, "income tax", "tax expense", "taxes"));
  const depreciation = Math.abs(findLine(pl, "depreciation"));
  const amortization = Math.abs(findLine(pl, "amortization"));
  const operatingIncome = findLine(
    pl,
    "operating income",
    "net operating income",
    "income from operations",
  );
  const revenue = findLine(pl, "total income", "total revenue", "gross profit");
  const rentLease = Math.abs(findLine(pl, "rent", "lease", "occupancy"));

  let ebitda = operatingIncome + depreciation + amortization;
  if (ebitda === 0) {
    ebitda = netIncome + interestExpense + incomeTax + depreciation + amortization;
  }

  const currentAssets = findLine(bs, "total current assets", "current assets");
  const currentLiabilities = findLine(bs, "total current liabilities", "current liabilities");
  const totalAssets = findLine(bs, "total assets");
  const totalLiabilities = findLine(bs, "total liabilities");
  let totalEquity = findLine(
    bs,
    "total equity",
    "stockholders' equity",
    "shareholders' equity",
    "member's equity",
  );
  if (totalEquity === 0) totalEquity = findLine(bs, "equity");

  // DEBUG: Log balance sheet equation
  const calculatedEquity = totalAssets - totalLiabilities;
  const isBalanced = Math.abs((totalAssets - (totalLiabilities + totalEquity))) < 0.01;
  console.log("[QB Parser Debug] Balance Sheet Check:", {
    totalAssets,
    totalLiabilities,
    totalEquity,
    calculatedEquity,
    isBalanced,
    equation: `${totalAssets} = ${totalLiabilities} + ${totalEquity} = ${totalLiabilities + totalEquity}`,
    allBSLines: bs,
  });

  let cash = sumMatching(bs, "cash and cash equivalents", "checking", "savings", "petty cash");
  if (cash === 0) cash = findLine(bs, "total bank accounts", "cash");

  const longTermDebt = sumMatching(
    bs,
    "long-term",
    "long term",
    "notes payable",
    "line of credit",
    "term loan",
    "mortgage",
  );
  const shortTermDebt = sumMatching(
    bs,
    "short-term",
    "short term",
    "current portion of long-term",
    "credit card",
  );
  let totalDebt = longTermDebt + shortTermDebt;
  if (totalDebt === 0 && totalLiabilities > 0) {
    totalDebt = Math.max(totalLiabilities - currentLiabilities, 0);
  }

  const principalPayments = Math.abs(findLine(cf, "repayment", "principal", "debt service"));

  const leverageRatio = ebitda > 0 ? round(totalDebt / ebitda, 4) : 0;
  const interestCoverageRatio =
    interestExpense > 0 ? round(ebitda / interestExpense, 4) : 0;
  const currentRatio =
    currentLiabilities > 0 ? round(currentAssets / currentLiabilities, 4) : 0;
  const fixedChargeDenominator = interestExpense + rentLease + principalPayments;
  const fixedChargeCoverage =
    fixedChargeDenominator > 0 ? round(ebitda / fixedChargeDenominator, 4) : 0;
  // Debt-to-Equity: if equity is negative or zero, report the magnitude of the negative ratio
  const debtToEquity = totalEquity !== 0 ? round(totalDebt / totalEquity, 4) : (totalDebt > 0 ? 999.9 : 0);
  const debtServiceDenominator = interestExpense + principalPayments;
  const debtServiceCoverage =
    debtServiceDenominator > 0 ? round(ebitda / debtServiceDenominator, 4) : 0;

  return {
    source: "quickbooks",
    raw: {
      profitAndLossLines: Object.keys(pl).length,
      balanceSheetLines: Object.keys(bs).length,
      cashFlowLines: Object.keys(cf).length,
    },
    reportLines: {
      profitAndLoss: pl,
      balanceSheet: bs,
      cashFlow: cf,
    },
    figures: {
      revenue,
      netIncome,
      operatingIncome,
      interestExpense,
      incomeTaxExpense: incomeTax,
      depreciation,
      amortization,
      ebitda: round(ebitda, 2),
      currentAssets,
      currentLiabilities,
      totalAssets,
      totalLiabilities,
      totalEquity,
      cash,
      longTermDebt,
      shortTermDebt,
      totalDebt: round(totalDebt, 2),
      rentAndLease: rentLease,
      principalPayments,
    },
    ratios: {
      leverageRatio,
      interestCoverageRatio,
      currentRatio,
      fixedChargeCoverage,
      debtToEquity,
      debtServiceCoverage,
    },
  };
}

function round(n, digits) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}
