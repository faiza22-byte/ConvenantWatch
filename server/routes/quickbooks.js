import { Router } from "express";
import { validateQuickBooksConfig } from "../config/quickbooks.js";
import { requireAuth } from "../middleware/auth.js";
import { Company } from "../models/Company.js";
import {
    buildAuthorizationUrl,
    disconnectQuickBooks,
    exchangeAuthorizationCode,
    isQuickBooksConnected,
    saveQuickBooksConnection,
} from "../quickbooks/connectionService.js";
import { signQbOAuthState, verifyQbOAuthState } from "../quickbooks/oauthState.js";

const router = Router();

function frontendBase() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
}

function resolveCompanyIdForUser(req, queryCompanyId) {
  if (req.user.role === "company") {
    if (!req.user.companyId) return { error: "Your account is not linked to a company", status: 400 };
    if (queryCompanyId && queryCompanyId !== req.user.companyId) {
      return { error: "Access denied", status: 403 };
    }
    return { companyId: req.user.companyId };
  }
  if (!queryCompanyId) {
    return { error: "companyId query parameter is required for admin", status: 400 };
  }
  return { companyId: queryCompanyId };
}

router.get("/connect", requireAuth, async (req, res) => {
  try {
    const missing = validateQuickBooksConfig();
    if (missing.length) {
      return res.status(503).json({
        message: `QuickBooks is not configured: ${missing.join(", ")}`,
      });
    }

    const resolved = resolveCompanyIdForUser(req, req.query.companyId);
    if (resolved.error) {
      return res.status(resolved.status).json({ message: resolved.error });
    }

    const company = await Company.findOne({ companyId: resolved.companyId });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const returnPath =
      typeof req.query.returnPath === "string" && req.query.returnPath.startsWith("/")
        ? req.query.returnPath
        : "/dashboard";
    const state = signQbOAuthState({ companyId: resolved.companyId, returnPath });
    res.json({ authorizationUrl: buildAuthorizationUrl(state) });
  } catch (err) {
    console.error("QB connect error:", err);
    res.status(500).json({ message: err.message || "Failed to start QuickBooks connection" });
  }
});

router.get("/callback", async (req, res) => {
  const redirectError = (code, detail) => {
    const params = new URLSearchParams({ qb: code, ...(detail ? { qb_error: detail } : {}) });
    res.redirect(`${frontendBase()}/dashboard?${params}`);
  };

  try {
    const { code, state, realmId } = req.query;
    if (!code || !state) {
      return redirectError("error", "missing_code_or_state");
    }

    const { companyId, returnPath } = verifyQbOAuthState(String(state));
    const tokens = await exchangeAuthorizationCode(String(code), realmId ? String(realmId) : undefined);

    const resolvedRealmId = realmId || tokens.realmId;
    if (!resolvedRealmId || !tokens.refreshToken) {
      return redirectError("error", "missing_tokens");
    }

    await saveQuickBooksConnection(companyId, {
      realmId: String(resolvedRealmId),
      refreshToken: tokens.refreshToken,
    });

    res.redirect(`${frontendBase()}${returnPath}?qb=connected`);
  } catch (err) {
    console.error("QB callback error:", err);
    redirectError("error", encodeURIComponent(err.message || "oauth_failed"));
  }
});

router.get("/status", requireAuth, async (req, res) => {
  try {
    const resolved = resolveCompanyIdForUser(req, req.query.companyId);
    if (resolved.error) {
      return res.status(resolved.status).json({ message: resolved.error });
    }

    const company = await Company.findOne({ companyId: resolved.companyId }).lean();
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      connected: isQuickBooksConnected(company),
      realmId: company.quickbooks?.realmId,
      connectedAt: company.quickbooks?.connectedAt,
      lastSync: company.lastSync,
      syncedAt: company.quickbooks?.syncedAt,
      lastSyncError: company.quickbooks?.lastSyncError,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/disconnect", requireAuth, async (req, res) => {
  try {
    const resolved = resolveCompanyIdForUser(req, req.body?.companyId || req.query.companyId);
    if (resolved.error) {
      return res.status(resolved.status).json({ message: resolved.error });
    }

    await disconnectQuickBooks(resolved.companyId);
    res.json({ ok: true, message: "QuickBooks disconnected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept manual paste of QuickBooks tokens (useful for sandbox / playground flows)
router.post("/manual", requireAuth, async (req, res) => {
  try {
    const resolved = resolveCompanyIdForUser(req, req.body?.companyId || req.query.companyId);
    if (resolved.error) {
      return res.status(resolved.status).json({ message: resolved.error });
    }

    const { realmId, refreshToken } = req.body || {};
    if (!realmId || !refreshToken) {
      return res.status(400).json({ message: "realmId and refreshToken are required" });
    }

    await saveQuickBooksConnection(resolved.companyId, {
      realmId: String(realmId),
      refreshToken: String(refreshToken),
    });

    res.json({ ok: true, message: "QuickBooks connection saved" });
  } catch (err) {
    console.error("QB manual save error:", err);
    res.status(500).json({ message: err.message || "Failed to save QuickBooks tokens" });
  }
});

export default router;
