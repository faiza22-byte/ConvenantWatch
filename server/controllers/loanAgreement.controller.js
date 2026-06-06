import { Company } from "../models/Company.js";
import { processLoanAgreementPipeline } from "../pipelines/loanAgreement.pipeline.js";

/* =========================
UPLOAD LOAN AGREEMENT
========================= */
export async function uploadLoanAgreement(req, res) {
  try {
    const file = req.file;
    const { companyId } = req.params;

    if (!file || !companyId) {
      return res.status(400).json({
        success: false,
        message: "file and companyId are required",
      });
    }

    const result = await processLoanAgreementPipeline({
      companyId,
      fileName: file.originalname,
      buffer: file.buffer,
    });

    return res.status(200).json({
      success: true,
      message: "Loan agreement processed successfully",
      data: result,
    });

  } catch (err) {
    console.error("❌ Upload failed:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
}

/* =========================
GET LOAN AGREEMENT
========================= */
export async function getLoanAgreement(req, res) {
  try {
    const { companyId } = req.params; // ✅ FIXED

    const company = await Company.findOne({ companyId });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.json({
      success: true,
      loanAgreement: company.loanAgreement || null,
    });

  } catch (err) {
    console.error("❌ getLoanAgreement error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch loan agreement",
    });
  }
}