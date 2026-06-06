import express from "express";
import multer from "multer";

import {
  getLoanAgreement,
  uploadLoanAgreement,
} from "../controllers/loanAgreement.controller.js";

import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/* =========================
MULTER CONFIG
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* =========================
AUTH MIDDLEWARE
========================= */
router.use(requireAuth);

/* =========================
UPLOAD + PROCESS
========================= */
router.post(
  "/:companyId/loan-agreement",
  upload.single("file"),
  uploadLoanAgreement
);

/* =========================
GET FINAL RESULT
========================= */
router.get(
  "/:companyId/loan-agreement",
  getLoanAgreement
);

export default router;