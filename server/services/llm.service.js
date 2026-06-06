import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

/* =========================
SAFE JSON PARSER
========================= */
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (err) {
    console.error("❌ Invalid JSON from LLM");
    return null;
  }
}

/* =========================
RETRY WRAPPER
========================= */
async function callLLM(messages, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages,
      });

      const content = res.choices?.[0]?.message?.content;
      const parsed = safeParse(content);
      if (parsed) return parsed;
    } catch (err) {
      console.error(`❌ LLM attempt ${i + 1} failed:`, err.message);
    }
  }

  return {
    title: "",
    referenceId: "",
    summary: "",
    sections: [],
    covenants: [],
  };
}

/* =========================
NORMALIZERS
========================= */
function normalizeThreshold(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;

  const text = String(value);
  const match = text.match(/[\d,.]+/);
  if (!match) return null;

  const numeric = Number(match[0].replace(/,/g, ""));
  return Number.isNaN(numeric) ? null : numeric;
}

function normalizeRequiredAccounts(accounts = []) {
  if (!Array.isArray(accounts)) return [];

  return accounts.map((acc) => {
    if (typeof acc === "string") {
      return { agreementTerm: acc, mappedField: "" };
    }
    return {
      agreementTerm: acc?.agreementTerm || "",
      mappedField: acc?.mappedField || "",
    };
  });
}

function normalizeCovenants(covenants = []) {
  return covenants.map((c) => ({
    name: c?.name || "",
    formula: c?.formula || "",
    threshold: normalizeThreshold(c?.threshold),
    operator: c?.operator || ">=",
    unit: c?.unit || "",
    description: c?.description || "",
    needsReview: Boolean(c?.needsReview),
    requiredAccounts: normalizeRequiredAccounts(c?.requiredAccounts),
  }));
}

/* =========================
MAIN LLM FUNCTION
Sends the full extracted PDF text to the LLM and gets
back the report structure + covenants in one call.
========================= */
export async function extractLoanAgreement(fullText) {
  const systemPrompt = `
You are a senior commercial lending analyst.
You will receive the full text of a loan agreement.
Extract a structured report and all financial covenants.
Return ONLY valid JSON. No markdown. No explanation.

Schema:
{
  "title": "string — full agreement title",
  "referenceId": "string — agreement/deal reference number if present, else empty string",
  "summary": "string — 3-5 sentence executive summary",
  "sections": [
    {
      "heading": "string — section name",
      "content": "string — 10-12 sentence description of what this section covers"
    }
  ],
  "covenants": [
    {
      "name": "string",
      "formula": "string — human-readable formula e.g. EBITDA / Total Debt",
      "threshold": number,
      "operator": ">= or <=",
      "unit": "string — x, %, $ etc.",
      "description": "string — what this covenant measures",
      "needsReview": false,
      "requiredAccounts": [
        {
          "agreementTerm": "string — term as written in the agreement e.g. Consolidated EBITDA",
          "mappedField": "string — QB field name if obvious, else empty string"
        }
      ]
    }
  ]
}

RULES:
1. threshold MUST be a plain number: 3.5 not "3.5x", 1250000 not "USD 1,250,000".
2. If threshold cannot be a plain number, set it to null and set needsReview to true.
3. operator: use ">=" for minimums (DSCR, interest coverage), "<=" for maximums (leverage).
4. requiredAccounts MUST be objects — NEVER plain strings.
5. Return JSON only.
`;

  const result = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: fullText.slice(0, 28000) },
  ]);

  return {
    title: result?.title || "",
    referenceId: result?.referenceId || "",
    summary: result?.summary || "",
    sections: Array.isArray(result?.sections) ? result.sections : [],
    covenants: normalizeCovenants(result?.covenants || []),
  };
}
