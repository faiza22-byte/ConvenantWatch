import type { Company } from "@/lib/mock-data";
import type { QuickBooksSyncPayload } from "@/components/QuickBooksDataPanel";

export function companyToQbPayload(company: Company): QuickBooksSyncPayload | null {
  const qb = company.quickbooks;
  if (!qb?.figures || Object.keys(qb.figures).length === 0) {
    return null;
  }
  return {
    companyName: company.name,
    lastSync: company.lastSync,
    realmId: qb.realmId,
    figures: qb.figures,
    ratios: qb.ratios,
    rawLineCounts: qb.rawLineCounts,
  };
}

export function hasQuickBooksFigures(
  payload: QuickBooksSyncPayload | null | undefined,
): boolean {
  if (!payload?.figures) return false;
  return Object.keys(payload.figures).length > 0;
}

export function mergeQbPayload(
  fromCompany: QuickBooksSyncPayload | null,
  fromSync: QuickBooksSyncPayload | null,
): QuickBooksSyncPayload | null {
  return fromSync ?? fromCompany;
}
