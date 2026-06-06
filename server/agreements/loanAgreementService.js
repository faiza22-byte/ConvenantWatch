import { ChromaClient } from "chromadb";
import OpenAI from "openai";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { computeLoanCovenants } from "../services/loanAgreements.service.js";
pdfjsLib.GlobalWorkerOptions.standardFontDataUrl =
  path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/standard_fonts/"
  );
/* =========================
   OPENAI
========================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";

const LLM_MODEL =
  process.env.OPENAI_LLM_MODEL || "gpt-4o-mini";

/* =========================
   CHROMA
========================= */

const CHROMA_HOST = process.env.CHROMA_HOST || "localhost";
const CHROMA_PORT = Number(process.env.CHROMA_PORT || 8000);
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || "loan-agreements";

/* =========================
   TEXT HELPERS
========================= */

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitText(text, size = 800, overlap = 120) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + size, text.length);

    const lastSpace = text.lastIndexOf(" ", end);
    if (lastSpace > start) end = lastSpace;

    chunks.push(text.slice(start, end));

    if (end === text.length) break;

    start = Math.max(end - overlap, end);
  }

  return chunks.slice(0, 200);
}

/* =========================
   PDF PARSER (FIXED ESM)
========================= */

async function parsePdf(buffer) {
  if (!buffer) throw new Error("Empty buffer");

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer), // ✅ FIXED
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    text +=
      content.items.map((item) => item.str).join(" ") + " ";
  }

  text = normalizeText(text);

  if (!text) throw new Error("No extractable text in PDF");

  return text;
}

/* =========================
   EMBEDDINGS (OPENAI)
========================= */

async function embed(chunks) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks,
  });

  return res.data.map((d) => d.embedding);
}

/* =========================
   CHROMA CLIENT
========================= */

const client = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false
});

/* =========================
   STORE IN CHROMA
========================= */

async function store(companyId, chunks, embeddings) {
  const collectionName = `loan-${companyId}`;

  console.log("=================================");
  console.log("CHROMA STORE");
  console.log("Collection:", collectionName);
  console.log("Chunks:", chunks.length);
  console.log("Embeddings:", embeddings.length);
  console.log("=================================");

  const collection = await client.getOrCreateCollection({
    name: collectionName,
    metadata: {
      source: "loan-agreements",
    },
  });

  console.log("Collection ready:", collectionName);

  await collection.upsert({
    ids: chunks.map((_, i) => `${companyId}-${i}`),
    embeddings,
    documents: chunks,
    metadatas: chunks.map((_, i) => ({
      chunkIndex: i,
      companyId,
    })),
  });

  console.log("Upsert complete");

  return {
    collection,
    collectionName,
  };
}

/* =========================
   QUERY CHROMA
========================= */

async function query(collection, text) {
  const emb = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  const vector = emb.data[0].embedding;

  const res = await collection.query({
    queryEmbeddings: [vector],
    nResults: 5,
    include: ["documents"],
  });

  return res.documents?.flat().join("\n") || "";
}

/* =========================
   LLM ANALYSIS
========================= */

async function analyze(context) {
  try {
    const res = await openai.chat.completions.create({
      model: LLM_MODEL,

      temperature: 0.1,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",

          content: `
You are an expert commercial lending analyst.

Return ONLY valid JSON.

Schema:

{
  "title": "string",

  "referenceId": "string",

  "summary": "string",

  "sections": [
    {
      "heading": "string",
      "content": "string"
    }
  ],

  "covenants": [
    {
      "name": "string",

      "formula": "string",

      "threshold": number,

      "operator": ">=",

      "unit": "x",

      "description": "string",

      "needsReview": false,

      "requiredAccounts": [
        {
          "agreementTerm": "string",

          "mappedField": "string"
        }
      ]
    }
  ]
}

IMPORTANT:

Extract ALL financial covenants.

Convert legal covenant language into executable formulas.

Examples:

"Leverage Ratio shall not exceed 4.0x"

becomes

{
  "name":"Leverage Ratio",
  "formula":"(TotalDebt - Cash) / EBITDA",
  "threshold":4,
  "operator":"<="
}

"Current Ratio shall be at least 1.20"

becomes

{
  "name":"Current Ratio",
  "formula":"CurrentAssets / CurrentLiabilities",
  "threshold":1.2,
  "operator":">="
}

Extract account mappings.

Example:

{
  "agreementTerm":"Consolidated EBITDA",
  "mappedField":"EBITDA"
}

QuickBooks field options:

Revenue
OperatingIncome
NetIncome
EBITDA
Cash
CurrentAssets
CurrentLiabilities
InterestExpense
RentLease
TotalDebt
LongTermDebt
ShortTermDebt
AccountsReceivable
AccountsPayable
Inventory
Equity

Rules:

1. Extract every covenant.

2. Extract threshold values.

3. Extract comparison operators.

4. Create executable formulas.

5. Create requiredAccounts mapping.

6. If formula cannot be confidently determined:

{
  "needsReview": true
}

7. Never invent values.

8. Return valid JSON only.
`,
        },

        {
          role: "user",
          content: context.slice(0, 12000),
        },
      ],
    });
    const content = res.choices[0].message.content;

console.log("🔥 RAW AI OUTPUT:\n", content);
    return JSON.parse(
      res.choices[0].message.content
    );
  } catch (err) {
    console.error(
      "Analysis failed:",
      err
    );

    return {
      title: "Unknown Document",
      referenceId: "",
      summary: "",
      sections: [],
      covenants: [],
    };
  }
}

/* =========================
   MAIN PIPELINE
========================= */

const result = await analyze(context);

const parsedAgreement = {
  sourceFileName: fileName,
  parsedAt: new Date().toISOString(),

  report: {
    title: result.title || "Loan Agreement",
    referenceId: result.referenceId || "",
    summary: result.summary || "",
    sections: Array.isArray(result.sections) ? result.sections : [],
  },

  chromaCollectionName: `loan-${companyId}`,
  chunkCount: chunks.length,

  // MUST match schema: loanAgreement.formulas
  formulas: Array.isArray(result.covenants) ? result.covenants : [],
};

try {
  const company = await Company.findOne({ companyId });

  if (!company) {
    console.error("❌ Company not found:", companyId);
    return parsedAgreement;
  }

  // 🔥 SAFE ASSIGNMENT (no need for markModified in modern mongoose unless strict issues)
  company.loanAgreement = parsedAgreement;

  await company.save();

  console.log("✅ Agreement Saved");

  // 🔥 PIPELINE 2 (CRITICAL FIX: always pass formulas explicitly)
  try {
    await computeLoanCovenants(companyId, parsedAgreement.formulas || []);
    console.log("✅ Covenant Results Computed");
  } catch (err) {
    console.error("❌ Covenant Computation Failed:", err);
  }

} catch (err) {
  console.error("❌ MongoDB Save Failed:", err);
}

return parsedAgreement;