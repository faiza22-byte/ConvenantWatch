from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import requests
from intuitlib.client import AuthClient

from .config import (
    API_BASE,
    QUICKBOOKS_CLIENT_ID,
    QUICKBOOKS_CLIENT_SECRET,
    QUICKBOOKS_ENVIRONMENT,
    QUICKBOOKS_REALM_ID,
    QUICKBOOKS_REDIRECT_URI,
    QUICKBOOKS_REFRESH_TOKEN,
)


class QuickBooksClient:
    def __init__(self) -> None:
        if not all(
            [
                QUICKBOOKS_CLIENT_ID,
                QUICKBOOKS_CLIENT_SECRET,
                QUICKBOOKS_REALM_ID,
                QUICKBOOKS_REFRESH_TOKEN,
            ]
        ):
            raise ValueError("QuickBooks OAuth credentials are incomplete")

        self.realm_id = QUICKBOOKS_REALM_ID
        self.auth_client = AuthClient(
            QUICKBOOKS_CLIENT_ID,
            QUICKBOOKS_CLIENT_SECRET,
            QUICKBOOKS_REDIRECT_URI,
            QUICKBOOKS_ENVIRONMENT,
        )
        self.auth_client.refresh(refresh_token=QUICKBOOKS_REFRESH_TOKEN)

    @property
    def access_token(self) -> str:
        return self.auth_client.access_token

    def _get_report(self, name: str, start: date, end: date) -> dict[str, Any]:
        url = f"{API_BASE}/v3/company/{self.realm_id}/reports/{name}"
        params = {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "accounting_method": "Accrual",
            "summarize_column_by": "Month",
        }
        response = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "application/json",
            },
            params=params,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("Report", payload)

    def fetch_financial_reports(self) -> dict[str, Any]:
        end = date.today()
        start = end - timedelta(days=365)

        return {
            "profitAndLoss": self._get_report("ProfitAndLoss", start, end),
            "balanceSheet": self._get_report("BalanceSheet", end, end),
            "cashFlow": self._get_report("CashFlow", start, end),
        }
