import { formatFinancialValue, labelizeKey } from "@/lib/format-financials";

export interface QuickBooksSyncPayload {
  figures?: Record<string, number>;
  ratios?: Record<string, number>;
  rawLineCounts?: Record<string, number>;
  realmId?: string;
  lastSync?: string;
  companyName?: string;
  covenantsUpdated?: number;
}

interface QuickBooksDataPanelProps {
  data: QuickBooksSyncPayload;
  variant?: "default" | "compact";
}

export function QuickBooksDataPanel({ data, variant = "default" }: QuickBooksDataPanelProps) {
  const figures = data.figures ?? {};
  const ratios = data.ratios ?? {};
  const ratioEntries = Object.entries(ratios);
  const compact = variant === "compact";
  const figureEntries = Object.entries(figures);
  const summaryKeys = ["revenue", "ebitda", "totalDebt", "cash"];
  const groupedFigures = [
    {
      title: "Income Statement",
      keys: ["revenue", "operatingIncome", "netIncome", "ebitda", "interestExpense", "incomeTaxExpense", "depreciation", "amortization", "rentAndLease"],
    },
    {
      title: "Balance Sheet",
      keys: ["cash", "currentAssets", "currentLiabilities", "totalAssets", "totalLiabilities", "totalEquity"],
    },
    {
      title: "Debt Profile",
      keys: ["longTermDebt", "shortTermDebt", "totalDebt", "principalPayments"],
    },
  ].map((group) => ({
    ...group,
    entries: group.keys
      .filter((key) => Object.prototype.hasOwnProperty.call(figures, key))
      .map((key) => [key, figures[key]] as [string, number]),
  }));

  if (figureEntries.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-10 border border-dashed border-slate-700 rounded-lg">
        No QuickBooks data yet. Run a sync to pull live figures from your books.
      </p>
    );
  }

  return (
    <div className="space-y-8 institutional-dashboard rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl">
      {(data.lastSync || data.companyName) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 border-b border-slate-800 pb-4">
          {data.companyName && <span className="font-medium text-slate-300">{data.companyName}</span>}
          {data.lastSync && <span>Last sync: {data.lastSync}</span>}
          {data.realmId && <span>Realm {data.realmId}</span>}
          {data.covenantsUpdated != null && (
            <span>{data.covenantsUpdated} covenants recalculated</span>
          )}
        </div>
      )}

      {figureEntries.length > 0 && (
        <section className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Financial snapshot
            </h3>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Corporate QuickBooks metrics presented in a concise institutional layout for covenant review.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {summaryKeys
              .filter((key) => Object.prototype.hasOwnProperty.call(figures, key))
              .map((key) => (
                <div key={key} className="qb-summary-card">
                  <p className="qb-summary-label">{labelizeKey(key)}</p>
                  <p className="qb-summary-value">{formatFinancialValue(key, Number(figures[key]))}</p>
                </div>
              ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {groupedFigures
              .filter((group) => group.entries.length > 0)
              .map((group) => (
                <div key={group.title} className="qb-statement-panel">
                  <div className="qb-statement-header">{group.title}</div>
                  <div className="divide-y divide-slate-800/40">
                    {group.entries.map(([key, val]) => (
                      <div key={key} className="qb-statement-row">
                        <span>{labelizeKey(key)}</span>
                        <strong>{formatFinancialValue(key, Number(val))}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}


      {data.rawLineCounts && Object.keys(data.rawLineCounts).length > 0 && (
        <p className="text-xs text-slate-500">
          Source report lines — P&amp;L:{" "}
          {data.rawLineCounts.profitAndLossLines ?? data.rawLineCounts.profitAndLoss ?? "—"}
          {" · "}
          Balance sheet:{" "}
          {data.rawLineCounts.balanceSheetLines ?? data.rawLineCounts.balanceSheet ?? "—"}
          {" · "}
          Cash flow:{" "}
          {data.rawLineCounts.cashFlowLines ?? data.rawLineCounts.cashFlow ?? "—"}
        </p>
      )}
    </div>
  );
}
