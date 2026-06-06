import "./loadEnv.js";

function first(...keys) {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export const qbConfig = {
  clientId: first(
    "QUICKBOOKS_CLIENT_ID",
    "Client_ID",
    "CLIENT_ID"
  ),

  clientSecret: first(
    "QUICKBOOKS_CLIENT_SECRET",
    "Client_secret",
    "Client_Secret",
    "CLIENT_SECRET"
  ),

  realmId: first(
    "QUICKBOOKS_REALM_ID",
    "REALM_ID"
  ),

  refreshToken: first(
    "QUICKBOOKS_REFRESH_TOKEN",
    "REFRESH_TOKEN"
  ),

  redirectUri:
    first("QUICKBOOKS_REDIRECT_URI") ||
    "https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl",

  environment: (
    first(
      "QUICKBOOKS_ENVIRONMENT",
      "QB_ENVIRONMENT"
    ) || "sandbox"
  ).trim().toLowerCase(),

  defaultCompanyId:
    first("QUICKBOOKS_DEFAULT_COMPANY_ID") || "acme",

  apiBase: "",
};

// Set API base safely after object creation
qbConfig.apiBase =
  qbConfig.environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

/**
 * Validate required QuickBooks OAuth config
 * Required for Connect + Sync
 */
export function validateQuickBooksConfig() {
  const missing = [];

  if (!qbConfig.clientId) {
    missing.push("QUICKBOOKS_CLIENT_ID");
  }

  if (!qbConfig.clientSecret) {
    missing.push("QUICKBOOKS_CLIENT_SECRET");
  }

  if (!qbConfig.redirectUri) {
    missing.push("QUICKBOOKS_REDIRECT_URI");
  }

  return missing;
}

/**
 * Check whether legacy single-tenant
 * env tokens exist for migration
 */
export function hasLegacyEnvTokens() {
  return Boolean(
    qbConfig.realmId &&
    qbConfig.refreshToken
  );
}
