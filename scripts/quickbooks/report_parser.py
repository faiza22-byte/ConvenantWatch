"""Parse QuickBooks Profit & Loss and Balance Sheet report JSON into covenant inputs."""
from __future__ import annotations

from typing import Any


def _parse_amount(raw: str | None) -> float:
    if raw is None:
        return 0.0
    cleaned = str(raw).strip().replace(",", "").replace("$", "")
    if cleaned in ("", "-", "—"):
        return 0.0
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    if negative:
        cleaned = cleaned[1:-1]
    try:
        value = float(cleaned)
    except ValueError:
        return 0.0
    return -value if negative else value


def _walk_rows(node: Any, out: dict[str, float]) -> None:
    if not isinstance(node, dict):
        return

    rows = node.get("Row")
    if rows is None:
        return
    if not isinstance(rows, list):
        rows = [rows]

    for row in rows:
        if not isinstance(row, dict):
            continue

        header = row.get("Header", {})
        if header:
            cols = header.get("ColData", [])
            if cols:
                label = str(cols[0].get("value", "")).strip()
                amount = _parse_amount(cols[-1].get("value") if len(cols) > 1 else None)
                if label:
                    out[label.lower()] = amount

        summary = row.get("Summary", {})
        if summary:
            cols = summary.get("ColData", [])
            if cols:
                label = str(cols[0].get("value", "")).strip()
                amount = _parse_amount(cols[-1].get("value") if len(cols) > 1 else None)
                if label:
                    out[label.lower()] = amount

        col_data = row.get("ColData")
        if col_data and isinstance(col_data, list) and len(col_data) >= 2:
            label = str(col_data[0].get("value", "")).strip()
            amount = _parse_amount(col_data[-1].get("value"))
            if label and label.lower() not in ("", "total"):
                out[label.lower()] = amount

        nested = row.get("Rows")
        if nested:
            _walk_rows(nested, out)


def flatten_report(report: dict[str, Any]) -> dict[str, float]:
    lines: dict[str, float] = {}
    _walk_rows(report.get("Rows", {}), lines)
    return lines


def _find_line(lines: dict[str, float], *patterns: str) -> float:
    for pattern in patterns:
        pat = pattern.lower()
        for label, amount in lines.items():
            if pat in label:
                return amount
    return 0.0


def _sum_matching(lines: dict[str, float], *patterns: str) -> float:
    total = 0.0
    used: set[str] = set()
    for pattern in patterns:
        pat = pattern.lower()
        for label, amount in lines.items():
            if pat in label and label not in used:
                total += amount
                used.add(label)
    return total


def extract_covenant_metrics(
    profit_and_loss: dict[str, Any],
    balance_sheet: dict[str, Any],
    cash_flow: dict[str, Any] | None = None,
) -> dict[str, Any]:
    pl = flatten_report(profit_and_loss)
    bs = flatten_report(balance_sheet)
    cf = flatten_report(cash_flow) if cash_flow else {}

    net_income = _find_line(
        pl,
        "net income",
        "net operating income",
        "net earnings",
    )
    interest_expense = abs(
        _find_line(
            pl,
            "interest expense",
            "interest paid",
            "finance costs",
            "bank charges",
        )
    )
    income_tax = abs(_find_line(pl, "income tax", "tax expense", "taxes"))
    depreciation = abs(_find_line(pl, "depreciation"))
    amortization = abs(_find_line(pl, "amortization"))
    operating_income = _find_line(
        pl,
        "operating income",
        "net operating income",
        "income from operations",
    )
    revenue = _find_line(pl, "total income", "total revenue", "gross profit")
    rent_lease = abs(_find_line(pl, "rent", "lease", "occupancy"))

    ebitda = operating_income + depreciation + amortization
    if ebitda == 0:
        ebitda = net_income + interest_expense + income_tax + depreciation + amortization

    current_assets = _find_line(bs, "total current assets", "current assets")
    current_liabilities = _find_line(
        bs, "total current liabilities", "current liabilities"
    )
    total_assets = _find_line(bs, "total assets")
    total_liabilities = _find_line(bs, "total liabilities")
    total_equity = _find_line(
        bs,
        "total equity",
        "stockholders' equity",
        "shareholders' equity",
        "member's equity",
    )
    if total_equity == 0:
        total_equity = _find_line(bs, "equity")

    cash = _sum_matching(
        bs,
        "cash and cash equivalents",
        "checking",
        "savings",
        "petty cash",
    )
    if cash == 0:
        cash = _find_line(bs, "total bank accounts", "cash")

    long_term_debt = _sum_matching(
        bs,
        "long-term",
        "long term",
        "notes payable",
        "line of credit",
        "term loan",
        "mortgage",
    )
    short_term_debt = _sum_matching(
        bs,
        "short-term",
        "short term",
        "current portion of long-term",
        "credit card",
    )
    total_debt = long_term_debt + short_term_debt
    if total_debt == 0 and total_liabilities > 0:
        total_debt = max(total_liabilities - current_liabilities, 0)

    principal_payments = abs(
        _find_line(cf, "repayment", "principal", "debt service")
        if cf
        else 0.0
    )

    leverage_ratio = round(total_debt / ebitda, 4) if ebitda > 0 else 0.0
    interest_coverage = (
        round(ebitda / interest_expense, 4) if interest_expense > 0 else 0.0
    )
    current_ratio = (
        round(current_assets / current_liabilities, 4)
        if current_liabilities > 0
        else 0.0
    )
    fixed_charge_denominator = interest_expense + rent_lease + principal_payments
    fixed_charge_coverage = (
        round(ebitda / fixed_charge_denominator, 4)
        if fixed_charge_denominator > 0
        else 0.0
    )
    debt_to_equity = (
        round(total_debt / total_equity, 4) if total_equity > 0 else 0.0
    )
    debt_service_coverage = (
        round(
            ebitda / (interest_expense + principal_payments),
            4,
        )
        if (interest_expense + principal_payments) > 0
        else 0.0
    )

    return {
        "source": "quickbooks",
        "raw": {
            "profitAndLossLines": len(pl),
            "balanceSheetLines": len(bs),
            "cashFlowLines": len(cf),
        },
        "reportLines": {
            "profitAndLoss": pl,
            "balanceSheet": bs,
            "cashFlow": cf,
        },
        "figures": {
            "revenue": revenue,
            "netIncome": net_income,
            "operatingIncome": operating_income,
            "interestExpense": interest_expense,
            "incomeTaxExpense": income_tax,
            "depreciation": depreciation,
            "amortization": amortization,
            "ebitda": round(ebitda, 2),
            "currentAssets": current_assets,
            "currentLiabilities": current_liabilities,
            "totalAssets": total_assets,
            "totalLiabilities": total_liabilities,
            "totalEquity": total_equity,
            "cash": cash,
            "longTermDebt": long_term_debt,
            "shortTermDebt": short_term_debt,
            "totalDebt": round(total_debt, 2),
            "rentAndLease": rent_lease,
            "principalPayments": principal_payments,
        },
        "ratios": {
            "leverageRatio": leverage_ratio,
            "interestCoverageRatio": interest_coverage,
            "currentRatio": current_ratio,
            "fixedChargeCoverage": fixed_charge_coverage,
            "debtToEquity": debt_to_equity,
            "debtServiceCoverage": debt_service_coverage,
        },
    }
