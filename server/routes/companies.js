import { Router } from "express";
import { Company } from "../models/Company.js";
import { toClientCompany } from "../utils/companyFactory.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

/* =========================
LIST COMPANIES
========================= */
router.get("/", async (req, res) => {
  try {
    let docs;

    if (req.user.role === "admin") {
      docs = await Company.find().sort({ name: 1 });
    } else {
      docs = await Company.find({
        companyId: req.user.companyId,
      });
    }

    res.json({
      success: true,
      companies: docs.map(toClientCompany),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to load companies",
    });
  }
});

/* =========================
GET SINGLE COMPANY
========================= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin" && req.user.companyId !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const doc = await Company.findOne({ companyId: id });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.json({
      success: true,
      company: toClientCompany(doc),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to load company",
    });
  }
});

export default router;