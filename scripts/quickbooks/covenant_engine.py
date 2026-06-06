"""Map QuickBooks metrics to covenant records and compliance status."""
from __future__ import annotations

from datetime import datetime
from typing import Any


def fmt_money(value: float) -> str:
    abs_val = abs(value)
    if abs_val >= 1_000_000:
        return f"${abs_val / 1_000_000:.1f}M"
    if abs_val >= 1_000:
        return f"${abs_val / 1_000:.1f}K"
    return f"${abs_val:,.0f}"


def _status(value: float, threshold: float, covenant_type: str) -> str:
    if threshold <= 0:
        return "PASS"
    if covenant_type == "MAX":
        if value > threshold:
            return "BREACH"
        if value > threshold * 0.95:
            return "WARNING"
        return "PASS"
    if value < threshold:
        return "BREACH"
    if value < threshold * 1.05:
        return "WARNING"
    return "PASS"


def _headroom(value: float, threshold: float, covenant_type: str) -> str:
    if threshold <= 0:
        return "—"
    if covenant_type == "MAX":
        pct = ((threshold - value) / threshold) * 100
    else:
        pct = ((value - threshold) / threshold) * 100
    return f"{pct:.2f}%"


COVENANT_BINDINGS: list[dict[str, Any]] = [
    {
        "names": ["Leverage Ratio"],
        "ratio_key": "leverageRatio",
        "default_threshold": 4.0,
        "default_type": "MAX",
    },
    {
        "names": ["Interest Coverage Ratio", "Interest Coverage"],
        "ratio_key": "interestCoverageRatio",
        "default_threshold": 2.5,
        "default_type": "MIN",
    },
    {
        "names": ["Current Ratio"],
        "ratio_key": "currentRatio",
        "default_threshold": 1.2,
        "default_type": "MIN",
    },
    {
        "names": ["Fixed Charge Coverage", "Fixed Charge"],
        "ratio_key": "fixedChargeCoverage",
        "default_threshold": 1.1,
        "default_type": "MIN",
    },
    {
        "names": ["Debt/Equity", "Debt to Equity"],
        "ratio_key": "debtToEquity",
        "default_threshold": 2.5,
        "default_type": "MAX",
    },
    {
        "names": ["Debt Service Coverage"],
        "ratio_key": "debtServiceCoverage",
        "default_threshold": 1.25,
        "default_type": "MIN",
    },
]


def _match_binding(covenant_name: str) -> dict[str, Any] | None:
    lower = covenant_name.lower()
    for binding in COVENANT_BINDINGS:
        if any(n.lower() in lower or lower in n.lower() for n in binding["names"]):
            return binding
    return None


def apply_metrics_to_company(
    company: dict[str, Any],
    metrics: dict[str, Any],
) -> dict[str, Any]:
    figures = metrics["figures"]
    ratios = metrics["ratios"]
    month_label = datetime.now().strftime("%b %Y")
    now_iso = datetime.now().strftime("%Y-%m-%d")

    financials = {
        "netIncome": fmt_money(figures["netIncome"]),
        "interestExpense": fmt_money(figures["interestExpense"]),
        "ebitda": fmt_money(figures["ebitda"]),
        "totalDebt": fmt_money(figures["totalDebt"]),
        "currentAssets": fmt_money(figures["currentAssets"]),
        "currentLiabilities": fmt_money(figures["currentLiabilities"]),
        "cash": fmt_money(figures["cash"]),
    }

    updated_covenants: list[dict[str, Any]] = []
    alerts = list(company.get("alerts") or [])
    existing_alert_keys = {
        (a.get("covenantName"), a.get("date")) for a in alerts
    }

    for covenant in company.get("covenants") or []:
        binding = _match_binding(covenant.get("name", ""))
        updated = dict(covenant)

        if binding:
            value = float(ratios.get(binding["ratio_key"], 0))
            threshold = float(
                covenant.get("threshold") or binding["default_threshold"]
            )
            covenant_type = covenant.get("type") or binding["default_type"]
            new_status = _status(value, threshold, covenant_type)

            history = list(covenant.get("history") or [])
            if not history or history[-1].get("month") != month_label:
                history.append({"month": month_label, "value": round(value, 4)})
            else:
                history[-1] = {"month": month_label, "value": round(value, 4)}

            old_status = covenant.get("status")
            updated.update(
                {
                    "value": round(value, 4),
                    "threshold": threshold,
                    "type": covenant_type,
                    "status": new_status,
                    "headroom": _headroom(value, threshold, covenant_type),
                    "history": history[-24:],
                }
            )

            if new_status in ("WARNING", "BREACH") and new_status != old_status:
                key = (covenant.get("name"), now_iso)
                if key not in existing_alert_keys:
                    alerts.insert(
                        0,
                        {
                            "id": f"qb-{covenant.get('id')}-{now_iso}",
                            "date": now_iso,
                            "covenantName": covenant.get("name"),
                            "status": new_status,
                            "value": round(value, 4),
                            "acknowledged": False,
                        },
                    )
                    existing_alert_keys.add(key)

        updated_covenants.append(updated)

    prefix = (company.get("companyId") or "co")[:8]

    def _already_has(binding: dict[str, Any]) -> bool:
        for covenant in updated_covenants:
            if _match_binding(covenant.get("name", "")) == binding:
                return True
        return False

    for binding in COVENANT_BINDINGS:
        if _already_has(binding):
            continue
        value = float(ratios.get(binding["ratio_key"], 0))
        if value <= 0:
            continue
        name = binding["names"][0]
        covenant_type = binding["default_type"]
        threshold = binding["default_threshold"]
        status = _status(value, threshold, covenant_type)
        updated_covenants.append(
            {
                "id": f"{prefix}-{binding['ratio_key']}",
                "name": name,
                "value": round(value, 4),
                "threshold": threshold,
                "type": covenant_type,
                "status": status,
                "headroom": _headroom(value, threshold, covenant_type),
                "history": [{"month": month_label, "value": round(value, 4)}],
            }
        )

    last_sync = datetime.now().strftime("%b %d, %I:%M %p").replace(" 0", " ")

    return {
        "financials": financials,
        "covenants": updated_covenants,
        "alerts": alerts[:50],
        "lastSync": last_sync,
        "quickbooks": {
            "realmId": metrics.get("realmId"),
            "syncedAt": datetime.utcnow().isoformat() + "Z",
            "figures": figures,
            "ratios": ratios,
            "rawLineCounts": metrics.get("raw", {}),
            "reportLines": metrics.get("reportLines"),
        },
    }
