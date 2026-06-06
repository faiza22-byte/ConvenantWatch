from __future__ import annotations

from typing import Any

from pymongo import MongoClient

from .config import DB_NAME, MONGODB_URI


def get_db():
    if not MONGODB_URI:
        raise ValueError("MONGODB_URI is not set")
    client = MongoClient(MONGODB_URI)
    return client[DB_NAME]


def find_company(db, company_id: str) -> dict[str, Any] | None:
    return db.companies.find_one({"companyId": company_id})


def find_company_by_realm(db, realm_id: str) -> dict[str, Any] | None:
    doc = db.companies.find_one({"quickbooks.realmId": realm_id})
    if doc:
        return doc
    return None


def update_company_from_sync(db, company_id: str, patch: dict[str, Any]) -> bool:
    result = db.companies.update_one(
        {"companyId": company_id},
        {
            "$set": {
                "financials": patch["financials"],
                "covenants": patch["covenants"],
                "alerts": patch["alerts"],
                "lastSync": patch["lastSync"],
                "quickbooks": patch["quickbooks"],
            }
        },
    )
    return result.matched_count > 0
