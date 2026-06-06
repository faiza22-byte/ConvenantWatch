import OpenAI from "openai";
import { Company } from "../models/Company.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
NORMALIZE QUICKBOOKS
========================= */
function normalizeFigures(figures = {}) {
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
SAFE MATH ENGINE
========================= */
function evaluateFormula(formula = {}, f) {
  try {
    const name = (formula.name || "").toLowerCase();
    const op = formula.operator;

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
          formulaUsed: formula?.formula || formula?.expression || "",
        };
    }
  } catch (err) {
    return { value: null, formulaUsed: "" };
  }
}

/* =========================
AI ENRICHMENT (SAFE)
========================= */
async function enrichWithAI(formulas, figures, computed) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You refine covenant status labels only. DO NOT change values or formulas. Return valid JSON array only.",
        },
        {
          role: "user",
          content: JSON.stringify({ formulas, figures, computed }),
        },
      ],
    });

    const text = res.choices?.[0]?.message?.content;

    if (!text) return computed;

    return JSON.parse(text);
  } catch (err) {
    console.error("AI enrichment failed:", err.message);
    return computed;
  }
}

/* =========================
MAIN PIPELINE 2 (FIXED)
========================= */
export async function computeLoanCovenants(companyId) {
  const company = await Company.findOne({ companyId });

  if (!company) throw new Error("Company not found");

  const rawFigures = company.quickbooks?.figures || {};
  const formulas = company.loanAgreement?.formulas || [];

  if (!Object.keys(rawFigures).length) {
    throw new Error("QuickBooks figures missing");
  }

  const f = normalizeFigures(rawFigures);

  /* 1. deterministic compute */
  const computed = formulas.map((formula) => {
    const result = evaluateFormula(formula, f);

    const value = result.value;

    let status = "WARNING";

    if (value === null || value === undefined) {
      status = "WARNING";
    } else {
      const op = formula.operator;

      if (op === "<=" || op === "lte" || op === "LESS_EQUAL") {
        status = value <= formula.threshold ? "PASS" : "BREACH";
      } else if (op === ">=" || op === "gte" || op === "GREATER_EQUAL") {
        status = value >= formula.threshold ? "PASS" : "BREACH";
      }
    }

    return {
      id: formula.name,
      name: formula.name,
      value,
      threshold: formula.threshold,
      status,
      formulaUsed: result.formulaUsed,
      mapping: formula.requiredAccounts || [],
    };
  });

  /* 2. AI refinement */
  const aiRefined = await enrichWithAI(formulas, f, computed);

  const results = Array.isArray(aiRefined) ? aiRefined : computed;

  /* 3. SAVE SAFELY */
  company.covenantResults = results;
  await company.save();

  return {
    companyId,
    computedAt: new Date(),
    results,
  };
}