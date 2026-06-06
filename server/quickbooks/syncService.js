import { validateQuickBooksConfig } from "../config/quickbooks.js";
import { io } from "../index.js";
import { Company } from "../models/Company.js";
import { processCovenantAlerts } from "../services/covenantAlertEngine.service.js";
import { markQuickBooksSyncError } from "./connectionService.js";
import { applyMetricsToCompany } from "./covenantEngine.js";
import { fetchFinancialReports } from "./qbClient.js";
import { extractCovenantMetrics } from "./reportParser.js";
export async function resolveCompanyForSync(companyId) {
  if (companyId) {
    const byId = await Company.findOne({ companyId }).lean();
    if (byId) return byId;
    throw new Error(`Company "${companyId}" not found.`);
  }

  throw new Error(
    "No company specified for QuickBooks sync. Log in as a company user or pass companyId.",
  );
}

function mergeQuickBooksPatch(existingQb, patchQb) {
  return {
    ...(existingQb || {}),
    ...patchQb,
    connected: patchQb?.connected ?? existingQb?.connected,
    refreshTokenEncrypted:
      patchQb?.refreshTokenEncrypted ?? existingQb?.refreshTokenEncrypted,
    connectedAt: patchQb?.connectedAt ?? existingQb?.connectedAt,
    realmId: patchQb?.realmId ?? existingQb?.realmId,
  };
}

export async function runQuickBooksSync(companyId, options = {}) {
  const missing = validateQuickBooksConfig();
  if (missing.length) {
    throw new Error(
      `Missing QuickBooks env: ${missing.join(", ")}. See .env.example and ENV_SETUP.md.`,
    );
  }

  const company = await resolveCompanyForSync(companyId);
  const resolvedId = company.companyId;

  try {
    console.log(`[QB Sync] Pulling reports for ${company.name} (${resolvedId})`);

    const reports = await fetchFinancialReports(resolvedId, {
      startDate: options.startDate,
      endDate: options.endDate,
    });
    const metrics = extractCovenantMetrics(
      reports.profitAndLoss,
      reports.balanceSheet,
      reports.cashFlow,
    );
    metrics.realmId = reports.realmId;

    const patch = applyMetricsToCompany(company, metrics);
    const existing = await Company.findOne({ companyId: resolvedId }).lean();
    const mergedQuickbooks = mergeQuickBooksPatch(existing?.quickbooks, {
      ...patch.quickbooks,
      connected: true,
      realmId: reports.realmId,
      refreshTokenEncrypted: existing?.quickbooks?.refreshTokenEncrypted,
      connectedAt: existing?.quickbooks?.connectedAt ?? new Date().toISOString(),
    });

    await Company.updateOne(
  { companyId: resolvedId },
  {
    $set: {
      financials: patch.financials,
      covenants: patch.covenants,
      alerts: patch.alerts,
      lastSync: patch.lastSync,
      quickbooks: mergedQuickbooks,
    },
  }
);

// 🔥 REAL-TIME ALERT ENGINE TRIGGER
const alertResult = await processCovenantAlerts(resolvedId);

console.log("🔥 ALERT RESULT:", alertResult);

if (alertResult?.alerts?.length) {
  io.to(resolvedId).emit("covenant-alerts", alertResult.alerts);
}

    const summary = {
      companyId: resolvedId,
      companyName: company.name,
      lastSync: patch.lastSync,
      realmId: reports.realmId,
      figures: metrics.figures,
      ratios: metrics.ratios,
      rawLineCounts: metrics.raw,
      covenantsUpdated: patch.covenants.length,
      dateRange: reports.dateRange,
    };

    console.log("[QB Sync] Complete:", JSON.stringify(summary, null, 2));
    return summary;
  } catch (err) {
    await markQuickBooksSyncError(resolvedId, err.message);
    throw err;
  }
}
