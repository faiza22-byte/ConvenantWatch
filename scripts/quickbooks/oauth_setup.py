#!/usr/bin/env python3
"""
One-time helper to obtain QUICKBOOKS_REALM_ID and QUICKBOOKS_REFRESH_TOKEN.

1. Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET to .env (or Client_ID / Client_secret).
2. Run: python scripts/quickbooks/oauth_setup.py
3. Open the printed URL, authorize, paste the redirect URL or auth code when prompted.
4. Copy realm id and refresh token into .env
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from intuitlib.client import AuthClient
from intuitlib.enums import Scopes

from quickbooks.config import (
    QUICKBOOKS_CLIENT_ID,
    QUICKBOOKS_CLIENT_SECRET,
    QUICKBOOKS_ENVIRONMENT,
    QUICKBOOKS_REDIRECT_URI,
)


def main() -> int:
    if not QUICKBOOKS_CLIENT_ID or not QUICKBOOKS_CLIENT_SECRET:
        print("Set Client_ID and Client_secret (or QUICKBOOKS_*) in .env first.")
        return 1

    auth_client = AuthClient(
        QUICKBOOKS_CLIENT_ID,
        QUICKBOOKS_CLIENT_SECRET,
        QUICKBOOKS_REDIRECT_URI,
        QUICKBOOKS_ENVIRONMENT,
    )

    scopes = [Scopes.ACCOUNTING]
    url = auth_client.get_authorization_url(scopes)
    print("\n=== QuickBooks OAuth setup ===\n")
    print("1. Open this URL in your browser:\n")
    print(url)
    print("\n2. After approving, paste the full redirect URL (or authorization code):\n")
    redirect_response = input().strip()

    if "code=" in redirect_response:
        from urllib.parse import parse_qs, urlparse

        parsed = urlparse(redirect_response)
        params = parse_qs(parsed.query)
        auth_code = params.get("code", [redirect_response])[0]
        realm_id = params.get("realmId", [None])[0]
    else:
        auth_code = redirect_response
        realm_id = None

    auth_client.get_bearer_token(auth_code, realm_id=realm_id)

    print("\nAdd these lines to your .env file:\n")
    print(f"QUICKBOOKS_REALM_ID={auth_client.realm_id}")
    print(f"QUICKBOOKS_REFRESH_TOKEN={auth_client.refresh_token}")
    print(f"QUICKBOOKS_ENVIRONMENT={QUICKBOOKS_ENVIRONMENT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
