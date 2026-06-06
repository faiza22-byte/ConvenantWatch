const COVENANT_BINDINGS = [
  { names: ["Leverage Ratio"], ratioKey: "leverageRatio", defaultThreshold: 4.0, defaultType: "MAX" },
  {
    names: ["Interest Coverage Ratio", "Interest Coverage"],
    ratioKey: "interestCoverageRatio",
    defaultThreshold: 2.5,
    defaultType: "MIN",
  },
  { names: ["Current Ratio"], ratioKey: "currentRatio", defaultThreshold: 1.2, defaultType: "MIN" },
  {
    names: ["Fixed Charge Coverage", "Fixed Charge"],
    ratioKey: "fixedChargeCoverage",
    defaultThreshold: 1.1,
    defaultType: "MIN",
  },
  { names: ["Debt/Equity", "Debt to Equity"], ratioKey: "debtToEquity", defaultThreshold: 2.5, defaultType: "MAX" },
  {
    names: ["Debt Service Coverage"],
    ratioKey: "debtServiceCoverage",
    defaultThreshold: 1.25,
    defaultType: "MIN",
  },
];

function fmtMoney(value) {
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000) return `$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `$${(absVal / 1_000).toFixed(1)}K`;
  return `$${absVal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function covenantStatus(value, threshold, type) {
  if (threshold <= 0) return "PASS";
  if (type === "MAX") {
    if (value > threshold) return "BREACH";
    if (value > threshold * 0.95) return "WARNING";
    return "PASS";
  }
  if (value < threshold) return "BREACH";
  if (value < threshold * 1.05) return "WARNING";
  return "PASS";
}

function headroom(value, threshold, type) {
  if (threshold <= 0) return "—";
  const pct =
    type === "MAX"
      ? ((threshold - value) / threshold) * 100
      : ((value - threshold) / threshold) * 100;
  return `${pct.toFixed(2)}%`;
}

function matchBinding(covenantName) {
  const lower = (covenantName || "").toLowerCase();
  return (
    COVENANT_BINDINGS.find((b) =>
      b.names.some((n) => lower.includes(n.toLowerCase()) || n.toLowerCase().includes(lower)),
    ) ?? null
  );
}

export function applyMetricsToCompany(company, metrics) {
  const { figures, ratios } = metrics;
  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });
  const nowIso = now.toISOString().slice(0, 10);

  const financials = {
    netIncome: fmtMoney(figures.netIncome),
    interestExpense: fmtMoney(figures.interestExpense),
    ebitda: fmtMoney(figures.ebitda),
    totalDebt: fmtMoney(figures.totalDebt),
    currentAssets: fmtMoney(figures.currentAssets),
    currentLiabilities: fmtMoney(figures.currentLiabilities),
    cash: fmtMoney(figures.cash),
  };

  const updatedCovenants = [];
  const alerts = [...(company.alerts || [])];
  const alertKeys = new Set(alerts.map((a) => `${a.covenantName}|${a.date}`));

  for (const covenant of company.covenants || []) {
    const binding = matchBinding(covenant.name);
    const updated = { ...covenant };

    if (binding) {
      const value = Number(ratios[binding.ratioKey] ?? 0);
      const threshold = Number(covenant.threshold ?? binding.defaultThreshold);
      const covenantType = covenant.type || binding.defaultType;
      const newStatus = covenantStatus(value, threshold, covenantType);

      const history = [...(covenant.history || [])];
      const last = history[history.length - 1];
      if (!last || last.month !== monthLabel) {
        history.push({ month: monthLabel, value: round(value, 4) });
      } else {
        history[history.length - 1] = { month: monthLabel, value: round(value, 4) };
      }

      const oldStatus = covenant.status;
      Object.assign(updated, {
        value: round(value, 4),
        threshold,
        type: covenantType,
        status: newStatus,
        headroom: headroom(value, threshold, covenantType),
        history: history.slice(-24),
      });

      if (
        (newStatus === "WARNING" || newStatus === "BREACH") &&
        newStatus !== oldStatus
      ) {
        const key = `${covenant.name}|${nowIso}`;
        if (!alertKeys.has(key)) {
          alerts.unshift({
            id: `qb-${covenant.id}-${nowIso}`,
            date: nowIso,
            covenantName: covenant.name,
            status: newStatus,
            value: round(value, 4),
            acknowledged: false,
          });
          alertKeys.add(key);
        }
      }
    }

    updatedCovenants.push(updated);
  }

  const prefix = (company.companyId || "co").slice(0, 8);
  const alreadyHas = (binding) =>
    updatedCovenants.some((c) => matchBinding(c.name) === binding);

  for (const binding of COVENANT_BINDINGS) {
    if (alreadyHas(binding)) continue;
    const value = Number(ratios[binding.ratioKey] ?? 0);
    if (value <= 0) continue;
    updatedCovenants.push({
      id: `${prefix}-${binding.ratioKey}`,
      name: binding.names[0],
      value: round(value, 4),
      threshold: binding.defaultThreshold,
      type: binding.defaultType,
      status: covenantStatus(value, binding.defaultThreshold, binding.defaultType),
      headroom: headroom(value, binding.defaultThreshold, binding.defaultType),
      history: [{ month: monthLabel, value: round(value, 4) }],
    });
  }

  const lastSync = now
    .toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/\s0(\d:)/, " $1");

  return {
    financials,
    covenants: updatedCovenants,
    alerts: alerts.slice(0, 50),
    lastSync,
    quickbooks: {
      realmId: metrics.realmId,
      syncedAt: new Date().toISOString(),
      figures,
      ratios,
      rawLineCounts: metrics.raw,
      reportLines: metrics.reportLines,
    },
  };
}

function round(n, digits) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}
