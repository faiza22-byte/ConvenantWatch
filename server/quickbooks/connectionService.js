import { hasLegacyEnvTokens, qbConfig } from "../config/quickbooks.js";
import { decryptSecret, encryptSecret } from "../lib/tokenCrypto.js";
import { Company } from "../models/Company.js";

export { hasLegacyEnvTokens };

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

function basicAuthHeader() {
  const credentials = Buffer.from(`${qbConfig.clientId}:${qbConfig.clientSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

async function tokenRequest(body) {
  console.log("[QB tokenRequest] Calling Intuit token endpoint...", {
    url: TOKEN_URL,
    bodyKeys: Object.keys(body),
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body),
  });
  const data = await response.json();
  console.log("[QB tokenRequest] Response status:", response.status, "ok:", response.ok);
  if (!response.ok) {
    console.error("[QB tokenRequest] Error response:", {
      error: data?.error,
      error_description: data?.error_description,
      status: response.status,
    });
    throw new Error(data?.error_description || data?.error || "QuickBooks token request failed");
  }
  console.log("[QB tokenRequest] Success - got new token, expires in:", data.expires_in, "seconds");
  return data;
}

export function isQuickBooksConnected(company) {
  if (company?.quickbooks?.refreshTokenEncrypted) return true;
  if (hasLegacyEnvTokens()) return true;
  const figures = company?.quickbooks?.figures;
  return Boolean(figures && Object.keys(figures).length > 0);
}

export function canSyncQuickBooks(company) {
  if (company?.quickbooks?.refreshTokenEncrypted) return true;
  return hasLegacyEnvTokens();
}

export function getConnectionSource(company) {
  if (company?.quickbooks?.refreshTokenEncrypted) return "oauth";
  if (hasLegacyEnvTokens()) return "env";
  return null;
}

export async function saveQuickBooksConnection(companyId, { realmId, refreshToken }) {
  await Company.updateMany(
    {
      companyId: { $ne: companyId },
      "quickbooks.realmId": realmId,
    },
    {
      $set: {
        "quickbooks.connected": false,
        "quickbooks.lastSyncError": "QuickBooks connection moved to another dashboard company.",
      },
      $unset: {
        "quickbooks.refreshTokenEncrypted": "",
        "quickbooks.realmId": "",
        "quickbooks.connectedAt": "",
      },
    },
  );

  await Company.updateOne(
    { companyId },
    {
      $set: {
        "quickbooks.connected": true,
        "quickbooks.realmId": realmId,
        "quickbooks.refreshTokenEncrypted": encryptSecret(refreshToken),
        "quickbooks.connectedAt": new Date().toISOString(),
        "quickbooks.lastSyncError": null,
      },
    },
  );
}

export async function disconnectQuickBooks(companyId) {
  const company = await Company.findOne({ companyId }).lean();
  if (!company?.quickbooks?.refreshTokenEncrypted) {
    await Company.updateOne(
      { companyId },
      {
        $set: { "quickbooks.connected": false },
        $unset: {
          "quickbooks.refreshTokenEncrypted": "",
          "quickbooks.realmId": "",
          "quickbooks.connectedAt": "",
        },
      },
    );
    return;
  }

  try {
    const refreshToken = decryptSecret(company.quickbooks.refreshTokenEncrypted);
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token: refreshToken }),
    });
  } catch {
    // Still clear local connection if revoke fails
  }

  await Company.updateOne(
    { companyId },
    {
      $set: { "quickbooks.connected": false },
      $unset: {
        "quickbooks.refreshTokenEncrypted": "",
        "quickbooks.realmId": "",
        "quickbooks.connectedAt": "",
      },
    },
  );
}

export async function exchangeAuthorizationCode(code, realmId) {
  const data = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: qbConfig.redirectUri,
  });

  return {
    realmId: realmId || data.realmId,
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function migrateEnvTokensToCompany(companyId) {
  if (!qbConfig.refreshToken || !qbConfig.realmId) return false;

  const company = await Company.findOne({ companyId }).lean();
  if (company?.quickbooks?.refreshTokenEncrypted) return true;

  const allowed =
    companyId === qbConfig.defaultCompanyId ||
    !company?.quickbooks?.realmId ||
    company?.quickbooks?.realmId === qbConfig.realmId;

  if (!allowed) return false;

  await saveQuickBooksConnection(companyId, {
    realmId: qbConfig.realmId,
    refreshToken: qbConfig.refreshToken,
  });
  return true;
}

export async function getQuickBooksCredentials(companyId) {
  const company = await Company.findOne({ companyId }).lean();
  if (!company) throw new Error(`Company "${companyId}" not found`);

  if (company.quickbooks?.refreshTokenEncrypted) {
    const refreshToken = decryptSecret(company.quickbooks.refreshTokenEncrypted);
    const realmId = company.quickbooks.realmId;
    if (refreshToken && realmId) {
      return { companyId, realmId, refreshToken, source: "oauth" };
    }
  }

  if (hasLegacyEnvTokens()) {
    return {
      companyId,
      realmId: qbConfig.realmId,
      refreshToken: qbConfig.refreshToken,
      source: "env",
    };
  }

  throw new Error(
    "QuickBooks is not available. Add tokens to .env or use Connect QuickBooks.",
  );
}

export async function persistRotatedRefreshToken(companyId, refreshToken) {
  if (!refreshToken) return;
  await Company.updateOne(
    { companyId },
    { $set: { "quickbooks.refreshTokenEncrypted": encryptSecret(refreshToken) } },
  );
}

export async function markQuickBooksSyncError(companyId, message) {
  await Company.updateOne({ companyId }, { $set: { "quickbooks.lastSyncError": message } });
}

export function buildAuthorizationUrl(state) {
  const scope = "com.intuit.quickbooks.accounting";
  const params = new URLSearchParams({
    client_id: qbConfig.clientId,
    redirect_uri: qbConfig.redirectUri,
    response_type: "code",
    scope,
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params}`;
}

export { tokenRequest };
