import { Company } from "../models/Company.js";
import { computeCovenants } from "../services/covenantCompute.service.js";
import { extractLoanAgreement } from "../services/llm.service.js";
import { chunkText, parsePdf } from "../services/pdf.service.js";
import { embedChunks, storeVectors } from "../services/vector.service.js";

export async function processLoanAgreementPipeline({
  companyId,
  fileName,
  buffer,
}) {
  console.log("🚀 Pipeline started:", companyId);

  try {
    /* =========================
    1. PDF EXTRACTION
    ========================= */
    if (!buffer) throw new Error("Missing PDF buffer");

    const text = await parsePdf(buffer);

    // ✅ Release buffer immediately — no longer needed
    buffer = null;

    const chunks = chunkText(text);
    const chunkCount = chunks.length;
    console.log("📄 PDF parsed:", chunkCount, "chunks");

    /* =========================
    2. LLM EXTRACTION
    ========================= */
    const result = await extractLoanAgreement(text);

    // ✅ Release full text after LLM — embedding uses chunks, not text
    // text = null; // uncomment if text is very large

    const safeCovenants = Array.isArray(result?.covenants)
      ? result.covenants.filter((c) => c?.name)
      : [];

    console.log("🧠 LLM extraction completed — covenants:", safeCovenants.length);

    /* =========================
    3. EMBED + STORE IN CHROMA
    ========================= */
    const embeddings = await embedChunks(chunks);
    const collectionName = await storeVectors(companyId, chunks, embeddings);

    // ✅ Release chunks + embeddings after Chroma — not needed downstream
    chunks.length = 0;
    embeddings.length = 0;

    console.log("📦 Vector storage completed:", collectionName);

    /* =========================
    4. BUILD AGREEMENT OBJECT + SAVE
    ========================= */
    const parsedAgreement = {
      sourceFileName: fileName,
      parsedAt: new Date().toISOString(),
      report: {
        title: result?.title || "Loan Agreement",
        referenceId: result?.referenceId || "",
        summary: result?.summary || "",
        sections: result?.sections || [],
      },
      chromaCollectionName: collectionName,
      chunkCount,              // ✅ use saved count, not chunks.length
      formulas: safeCovenants,
    };

    const company = await Company.findOne({ companyId });
    if (!company) throw new Error(`Company not found: ${companyId}`);

    company.loanAgreement = parsedAgreement;
    company.markModified("loanAgreement");
    await company.save();

    console.log("💾 Saved to MongoDB");

    /* =========================
    5. COMPUTE COVENANT RESULTS
    ========================= */
    const computed = computeCovenants(
      safeCovenants,
      company.quickbooks?.figures || {}
    );

    company.covenantResults = computed;
    await company.save();

    console.log("📊 Covenants computed:", computed.length);

    return {
      success: true,
      companyId,
      chunks: chunkCount,
      covenants: safeCovenants.length,
      collectionName,
    };

  } catch (err) {
    console.error("❌ Pipeline failed:", err.message);
    throw new Error(`Pipeline error: ${err.message}`);
  }
}