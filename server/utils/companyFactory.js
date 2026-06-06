import {
    canSyncQuickBooks,
    getConnectionSource,
    isQuickBooksConnected,
} from "../quickbooks/connectionService.js";

const DEFAULT_FINANCIALS = {
  netIncome: "$0",
  interestExpense: "$0",
  ebitda: "$0",
  totalDebt: "$0",
  currentAssets: "$0",
  currentLiabilities: "$0",
  cash: "$0",
};

export function slugifyCompanyId(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : `company-${suffix}`;
}

export function buildStarterCompany({ companyId, name, industry }) {
  const prefix = companyId.slice(0, 8);
  return {
    companyId,
    name,
    industry: industry || "",
    lastSync: "Just now",
    financials: { ...DEFAULT_FINANCIALS },
    alerts: [],
    covenants: [
      {
        id: `${prefix}-lev`,
        name: "Leverage Ratio",
        value: 2.5,
        threshold: 4.0,
        type: "MAX",
        status: "PASS",
        headroom: "37.5%",
        history: [{ month: "May 2025", value: 2.5 }],
      },
      {
        id: `${prefix}-int`,
        name: "Interest Coverage Ratio",
        value: 3.0,
        threshold: 2.5,
        type: "MIN",
        status: "PASS",
        headroom: "20%",
        history: [{ month: "May 2025", value: 3.0 }],
      },
      {
        id: `${prefix}-cur`,
        name: "Current Ratio",
        value: 1.5,
        threshold: 1.2,
        type: "MIN",
        status: "PASS",
        headroom: "25%",
        history: [{ month: "May 2025", value: 1.5 }],
      },
    ],
  };
}

export function toPublicUser(user, companyName) {
  return {
    email: user.email,
    role: user.role,
    companyId: user.companyId || undefined,
    companyName: companyName || undefined,
    fullName: user.fullName || undefined,
  };
}

export function toClientCompany(doc) {
  const qb = doc.quickbooks;
  return {
    id: doc.companyId,
    companyId: doc.companyId,
    name: doc.name,
    lastSync: doc.lastSync,
    financials: doc.financials,
    alerts: doc.alerts,
    covenants: doc.covenants,
    quickbooks: qb
      ? {
          connected: isQuickBooksConnected(doc),
          canSync: canSyncQuickBooks(doc),
          connectionSource: getConnectionSource(doc),
          realmId: qb.realmId,
          connectedAt: qb.connectedAt,
          syncedAt: qb.syncedAt,
          lastSyncError: qb.lastSyncError,
          figures: qb.figures ?? {},
          ratios: qb.ratios ?? {},
          rawLineCounts: qb.rawLineCounts ?? {},
          reportLineCounts: qb.reportLines
            ? {
                profitAndLoss: Object.keys(qb.reportLines.profitAndLoss ?? {}).length,
                balanceSheet: Object.keys(qb.reportLines.balanceSheet ?? {}).length,
                cashFlow: Object.keys(qb.reportLines.cashFlow ?? {}).length,
              }
            : undefined,
        }
      : {
          connected: isQuickBooksConnected(doc),
          canSync: canSyncQuickBooks(doc),
          connectionSource: getConnectionSource(doc),
          figures: {},
          ratios: {},
        },
        loanAgreement: doc.loanAgreement,
  };
}
