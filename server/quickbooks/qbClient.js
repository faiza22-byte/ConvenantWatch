import { hasLegacyEnvTokens, qbConfig } from "../config/quickbooks.js";
import {
  getQuickBooksCredentials,
  persistRotatedRefreshToken,
  tokenRequest,
} from "./connectionService.js";

/** @type {Map<string, { accessToken: string, expiresAt: number }>} */
const accessTokenCache = new Map();

export function clearAccessTokenCache(companyId) {
  if (companyId) accessTokenCache.delete(companyId);
  else accessTokenCache.clear();
}

async function refreshAccessToken(companyId, refreshToken, { persistRotation = true, source } = {}) {
  console.log(`[QB RefreshToken] Refreshing access token for company: ${companyId}`);
  let data;
  try {
    data = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    console.log(`[QB RefreshToken] Success - new token expires in ${data.expires_in}s`);
  } catch (err) {
    clearAccessTokenCache(companyId);
    console.error(`[QB RefreshToken] Failed:`, err.message);
    const hint = source === "env"
      ? " Refresh QUICKBOOKS_REFRESH_TOKEN from the Intuit OAuth Playground, restart the API, and sync again."
      : " Reconnect QuickBooks from the dashboard.";
    throw new Error(`${err.message}${hint}`);
  }

  if (data.refresh_token && persistRotation) {
    console.log(`[QB RefreshToken] Persisting rotated token to database`);
    await persistRotatedRefreshToken(companyId, data.refresh_token);
  }

  const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000;
  accessTokenCache.set(companyId, { accessToken: data.access_token, expiresAt });
  return data.access_token;
}

async function getAccessToken(companyId, refreshToken, options) {
  const cached = accessTokenCache.get(companyId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }
  return refreshAccessToken(companyId, refreshToken, options);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function parseReportDate(value, label) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || isoDate(date) !== value) {
    throw new Error(`${label} is not a valid date`);
  }

  return date;
}

function resolveReportDateRange({ startDate, endDate } = {}) {
  const end = parseReportDate(endDate, "endDate") ?? new Date();
  const start = parseReportDate(startDate, "startDate") ?? new Date(end);

  if (!startDate) {
    start.setFullYear(start.getFullYear() - 1);
  }

  if (start > end) {
    throw new Error("startDate must be on or before endDate");
  }

  return { start, end };
}

async function getReport(accessToken, realmId, reportName, start, end) {
  const url = new URL(`${qbConfig.apiBase}/v3/company/${realmId}/reports/${reportName}`);
  url.searchParams.set("start_date", isoDate(start));
  url.searchParams.set("end_date", isoDate(end));
  url.searchParams.set("accounting_method", "Accrual");

  console.log(`[QB Report] Fetching ${reportName} for realm ${realmId}`, {
    url: url.toString(),
    dateRange: `${isoDate(start)} to ${isoDate(end)}`,
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  console.log(`[QB Report] ${reportName} response status:`, response.status, "ok:", response.ok);
  
  if (!response.ok) {
    const detail =
      data?.Fault?.Error?.[0]?.Message ||
      data?.fault?.error?.[0]?.message ||
      `HTTP ${response.status}`;
    const code = data?.Fault?.Error?.[0]?.code || data?.fault?.error?.[0]?.code;
    console.error(`[QB Report] Error fetching ${reportName}:`, { detail, code, fullError: data });
    throw new Error(
      code
        ? `QuickBooks ${reportName}: ${detail} (${code})`
        : `QuickBooks report ${reportName} failed: ${detail}`,
    );
  }

  const reportData = data.Report ?? data;
  console.log(`[QB Report] ${reportName} success - report has rows:`, !!reportData?.Rows);
  return reportData;
}

export async function fetchFinancialReports(companyId, dateRange = {}) {
  console.log(`[QB Fetch] Starting financial reports fetch for company: ${companyId}`);
  clearAccessTokenCache(companyId);

  const creds = await getQuickBooksCredentials(companyId);
  let { realmId, refreshToken, source } = creds;
  const persistRotation = true;
  console.log(`[QB Fetch] Got credentials from source: ${source}, realmId: ${realmId}`);

  let accessToken;
  try {
    accessToken = await getAccessToken(companyId, refreshToken, { persistRotation, source });
  } catch (err) {
    if (source === "env" || !hasLegacyEnvTokens()) {
      throw err;
    }

    console.warn("[QB Fetch] Saved QuickBooks token failed; trying legacy .env credentials");
    realmId = qbConfig.realmId;
    refreshToken = qbConfig.refreshToken;
    source = "env";
    accessToken = await refreshAccessToken(companyId, refreshToken, {
      persistRotation: true,
      source,
    });
  }
  console.log(`[QB Fetch] Got initial access token`);

  const { start, end } = resolveReportDateRange(dateRange);
  console.log(`[QB Fetch] Date range: ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`);

  async function fetchAll(token) {
    console.log(`[QB Fetch] Fetching all 3 reports with token...`);
    return Promise.all([
      getReport(token, realmId, "ProfitAndLoss", start, end),
      getReport(token, realmId, "BalanceSheet", end, end),
      getReport(token, realmId, "CashFlow", start, end),
    ]);
  }

  try {
    const [profitAndLoss, balanceSheet, cashFlow] = await fetchAll(accessToken);
    console.log(`[QB Fetch] All reports fetched successfully`);
    return {
      profitAndLoss,
      balanceSheet,
      cashFlow,
      realmId,
      dateRange: { startDate: isoDate(start), endDate: isoDate(end) },
    };
  } catch (err) {
    console.log(`[QB Fetch] Initial fetch failed, checking if auth error:`, err.message);
    if (!String(err.message).includes("AuthenticationFailed")) {
      throw err;
    }
    console.log(`[QB Fetch] Auth failed - refreshing token and retrying...`);
    clearAccessTokenCache(companyId);
    accessToken = await refreshAccessToken(companyId, refreshToken, { persistRotation });
    const [profitAndLoss, balanceSheet, cashFlow] = await fetchAll(accessToken);
    console.log(`[QB Fetch] Retry successful after token refresh`);
    return {
      profitAndLoss,
      balanceSheet,
      cashFlow,
      realmId,
      dateRange: { startDate: isoDate(start), endDate: isoDate(end) },
    };
  }
}
