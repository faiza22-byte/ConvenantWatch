export function normalizeFigures(figures = {}) {
  return {
    NOI: figures.operatingIncome ?? 0,
    netIncome: figures.netIncome ?? 0,
    ebitda: figures.ebitda ?? 0,
    totalDebt: figures.totalDebt ?? 0,
    interestExpense: figures.interestExpense ?? 0,
    principalPayments: figures.principalPayments ?? 0,
    cash: figures.cash ?? 0,

    debtService:
      (figures.interestExpense ?? 0) +
      (figures.principalPayments ?? 0),
  };
}

/* =========================
SAFE FORMULA ENGINE
========================= */
export function evaluateCovenant(formula = {}, f) {
  const name = (formula.name || "").toLowerCase();

  switch (name) {
    case "leverage ratio":
      return {
        value: f.ebitda ? f.totalDebt / f.ebitda : null,
        formulaUsed: "TotalDebt / EBITDA",
      };

    case "net leverage ratio":
      return {
        value: f.ebitda ? (f.totalDebt - f.cash) / f.ebitda : null,
        formulaUsed: "(TotalDebt - Cash) / EBITDA",
      };

    case "dscr":
      return {
        value: f.debtService ? f.ebitda / f.debtService : null,
        formulaUsed: "EBITDA / DebtService",
      };

    case "interest coverage":
      return {
        value: f.interestExpense ? f.ebitda / f.interestExpense : null,
        formulaUsed: "EBITDA / InterestExpense",
      };

    case "current ratio":
      return {
        value: null,
        formulaUsed: "CurrentAssets / CurrentLiabilities",
      };

    default:
      return {
        value: null,
        formulaUsed: formula?.formula || "",
      };
  }
}
function normalizeRequiredAccounts(accounts = []) {
  if (!Array.isArray(accounts)) return [];

  return accounts.map((acc) => {
    if (typeof acc === "string") {
      return {
        agreementTerm: acc,
        mappedField: "",
      };
    }

    return {
      agreementTerm: acc.agreementTerm || "",
      mappedField: acc.mappedField || "",
    };
  });
}
/* =========================
MAIN COMPUTE ENGINE
========================= */
export function computeCovenants(formulas = [], rawFigures = {}) {
  const f = normalizeFigures(rawFigures);

  return formulas.map((formula) => {
    const result = evaluateCovenant(formula, f);

    const value = result.value;

    let status = "WARNING";

    if (value === null || value === undefined) {
      status = "WARNING";
    } else {
      if (formula.operator === "<=" && value <= formula.threshold)
        status = "PASS";
      else if (formula.operator === ">=" && value >= formula.threshold)
        status = "PASS";
      else status = "BREACH";
    }

    return {
      id: formula.name,
      name: formula.name,
      value,
      threshold: formula.threshold,
      status,
      formulaUsed: result.formulaUsed,
      mapping: normalizeRequiredAccounts(formula.requiredAccounts),
    };
  });
}