from __future__ import annotations

import json
import sys
from typing import Any

from .config import (
    QUICKBOOKS_DEFAULT_COMPANY_ID,
    QUICKBOOKS_REALM_ID,
    validate_for_sync,
)
from .covenant_engine import apply_metrics_to_company
from .mongo_store import find_company, find_company_by_realm, get_db, update_company_from_sync
from .qb_client import QuickBooksClient
from .report_parser import extract_covenant_metrics


def run_sync(company_id: str | None = None) -> dict[str, Any]:
    missing = validate_for_sync()
    if missing:
        raise RuntimeError(
            "Missing environment variables: "
            + ", ".join(missing)
            + ". Add QUICKBOOKS_REALM_ID and QUICKBOOKS_REFRESH_TOKEN after OAuth."
        )

    target_company_id = company_id or QUICKBOOKS_DEFAULT_COMPANY_ID
    db = get_db()

    company = find_company(db, target_company_id)
    if not company and QUICKBOOKS_REALM_ID:
        company = find_company_by_realm(db, QUICKBOOKS_REALM_ID)
        if company:
            target_company_id = company["companyId"]

    if not company:
        raise RuntimeError(
            f"Company '{target_company_id}' not found in MongoDB. "
            "Run the API server once to seed demo data, or sign up a company account."
        )

    print(f"Pulling QuickBooks reports for company: {company.get('name')} ({target_company_id})")
    qb = QuickBooksClient()
    reports = qb.fetch_financial_reports()

    metrics = extract_covenant_metrics(
        reports["profitAndLoss"],
        reports["balanceSheet"],
        reports.get("cashFlow"),
    )
    metrics["realmId"] = QUICKBOOKS_REALM_ID

    patch = apply_metrics_to_company(company, metrics)
    updated = update_company_from_sync(db, target_company_id, patch)

    if not updated:
        raise RuntimeError(f"Failed to update company '{target_company_id}' in MongoDB")

    summary = {
        "companyId": target_company_id,
        "companyName": company.get("name"),
        "lastSync": patch["lastSync"],
        "ratios": metrics["ratios"],
        "figures": metrics["figures"],
        "covenantsUpdated": len(patch["covenants"]),
    }

    print("QuickBooks sync complete:")
    print(json.dumps(summary, indent=2, default=str))
    return summary


def main() -> int:
    company_id = sys.argv[1] if len(sys.argv) > 1 else None
    try:
        run_sync(company_id)
        return 0
    except Exception as exc:
        print(f"Sync failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
