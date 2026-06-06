import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


def _first(*keys: str) -> str | None:
    for key in keys:
        value = os.getenv(key)
        if value and value.strip():
            return value.strip()
    return None


MONGODB_URI = _first("MONGODB_URI")
DB_NAME = _first("MONGODB_DB_NAME") or "covenantwatch"

QUICKBOOKS_CLIENT_ID = _first("QUICKBOOKS_CLIENT_ID", "Client_ID", "CLIENT_ID")
QUICKBOOKS_CLIENT_SECRET = _first(
    "QUICKBOOKS_CLIENT_SECRET", "Client_secret", "CLIENT_SECRET"
)
QUICKBOOKS_REALM_ID = _first("QUICKBOOKS_REALM_ID", "REALM_ID", "Realm_ID")
QUICKBOOKS_REFRESH_TOKEN = _first("QUICKBOOKS_REFRESH_TOKEN", "REFRESH_TOKEN")
QUICKBOOKS_REDIRECT_URI = _first("QUICKBOOKS_REDIRECT_URI") or "https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl"
QUICKBOOKS_ENVIRONMENT = (_first("QUICKBOOKS_ENVIRONMENT", "QB_ENVIRONMENT") or "sandbox").lower()
QUICKBOOKS_DEFAULT_COMPANY_ID = _first("QUICKBOOKS_DEFAULT_COMPANY_ID") or "acme"

API_BASE = (
    "https://sandbox-quickbooks.api.intuit.com"
    if QUICKBOOKS_ENVIRONMENT == "sandbox"
    else "https://quickbooks.api.intuit.com"
)


def validate_for_sync() -> list[str]:
    missing = []
    if not MONGODB_URI:
        missing.append("MONGODB_URI")
    if not QUICKBOOKS_CLIENT_ID:
        missing.append("QUICKBOOKS_CLIENT_ID (or Client_ID)")
    if not QUICKBOOKS_CLIENT_SECRET:
        missing.append("QUICKBOOKS_CLIENT_SECRET (or Client_secret)")
    if not QUICKBOOKS_REALM_ID:
        missing.append("QUICKBOOKS_REALM_ID")
    if not QUICKBOOKS_REFRESH_TOKEN:
        missing.append("QUICKBOOKS_REFRESH_TOKEN")
    return missing
