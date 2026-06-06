import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { runQuickBooksSync } from "../quickbooks/syncService.js";

const router = Router();

router.post("/quickbooks", requireAuth, async (req, res) => {
  try {
    let companyId = req.body?.companyId;

    if (req.user.role === "company") {
      if (!req.user.companyId) {
        return res.status(400).json({ message: "Your account is not linked to a company" });
      }
      if (companyId && companyId !== req.user.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      companyId = req.user.companyId;
    } else if (!companyId) {
      return res.status(400).json({
        message: "companyId is required for admin sync (use the company linked to QuickBooks)",
      });
    }

    const summary = await runQuickBooksSync(companyId, {
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
    });
    res.json({
      ok: true,
      message: "QuickBooks sync completed",
      ...summary,
    });
  } catch (err) {
    console.error("QuickBooks sync error:", err);
    res.status(500).json({
      message: err.message || "QuickBooks sync failed",
    });
  }
});

export default router;
