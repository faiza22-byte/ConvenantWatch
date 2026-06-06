# Environment setup (production-safe)

Copy `.env.example` to `.env` and replace every placeholder. **Never commit `.env` or share tokens in chat.**

## 1. MongoDB Atlas

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → create a DB user and password.
3. **Network Access** → add your IP (or `0.0.0.0/0` only for local dev).
4. **Connect** → Drivers → copy the connection string.

```env
MONGODB_URI=mongodb+srv://DB_USER:DB_PASSWORD@cluster0.xxxxx.mongodb.net/?appName=covenantwatch
```

## 2. API auth

```env
PORT=5000
JWT_SECRET=use-openssl-rand-hex-32-or-similar-long-secret
```

Generate a secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 3. QuickBooks / Intuit

### App credentials

1. [Intuit Developer](https://developer.intuit.com) → **Apps** → create app.
2. Enable **QuickBooks Online Accounting**.
3. Copy **Client ID** and **Client secret**.

```env
QUICKBOOKS_CLIENT_ID=ABxxxxxxxx
QUICKBOOKS_CLIENT_SECRET=xxxxxxxx
QUICKBOOKS_ENVIRONMENT=sandbox
FRONTEND_URL=http://localhost:5173
QUICKBOOKS_REDIRECT_URI=http://localhost:5000/api/integrations/quickbooks/callback
```

In the Intuit app (**Keys & OAuth**), add the same **Redirect URI** as `QUICKBOOKS_REDIRECT_URI`.

### Per-company connection (recommended)

1. Start API + frontend: `npm run dev:all`
2. Log in as a company user (e.g. `cfo@acme.com` / `acme2025`).
3. On the dashboard, click **Connect QuickBooks** and approve in Intuit.
4. Tokens are stored **encrypted on that company** in MongoDB (not in `.env`).
5. Click **Sync QuickBooks** to pull reports.

Each borrower company connects its own QuickBooks file. One realm cannot be linked to two app companies.

### Legacy `.env` tokens (optional dev shortcut)

If you already have playground tokens, you can still set:

```env
QUICKBOOKS_REALM_ID=1234567890
QUICKBOOKS_REFRESH_TOKEN="RT1-xxxxxxxx"
QUICKBOOKS_DEFAULT_COMPANY_ID=acme
```

On the **first sync** for that company, tokens are copied into MongoDB. Prefer **Connect QuickBooks** in the UI for new setups.

### OAuth Playground only

[OAuth 2.0 Playground](https://developer.intuit.com/app/developer/playground) still works to obtain tokens for the legacy `.env` path above.

## 4. Nightly sync (node-cron)

Runs inside the API when `ENABLE_QB_CRON=true`:

```env
ENABLE_QB_CRON=true
QB_CRON_SCHEDULE=0 2 * * *
QB_CRON_MAX_RUNS=4
QB_CRON_RUN_ON_START=false
```

- **`0 2 * * *`** = every day at 2:00 AM (server local time, or set `QB_CRON_TIMEZONE`).
- **`QB_CRON_MAX_RUNS=4`** = stop after 4 scheduled runs (next 4 nights).

Manual sync anytime:

```bash
npm run sync:qb
```

Or use **Sync QuickBooks** in the dashboard (API must be running).

## 5. Run the stack

```bash
npm install
npm run dev:all
```

## Checklist

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | Database |
| `JWT_SECRET` | Yes | Login tokens |
| `PORT` | No (5000) | API port |
| `QUICKBOOKS_CLIENT_ID` | For QB | Intuit app |
| `QUICKBOOKS_CLIENT_SECRET` | For QB | Intuit app |
| `QUICKBOOKS_REDIRECT_URI` | For QB Connect | Must match Intuit app |
| `FRONTEND_URL` | For OAuth return | e.g. `http://localhost:5173` |
| `QUICKBOOKS_REALM_ID` | Optional legacy | Migrated on first sync |
| `QUICKBOOKS_REFRESH_TOKEN` | Optional legacy | Migrated on first sync |
| `QUICKBOOKS_ENVIRONMENT` | No | `sandbox` or `production` |
| `QUICKBOOKS_DEFAULT_COMPANY_ID` | No | Legacy env token target |
| `TOKEN_ENCRYPTION_KEY` | No | Defaults to `JWT_SECRET` |
| `ENABLE_QB_CRON` | No | `true` to schedule |
| `QB_CRON_MAX_RUNS` | No | Default `4` |
