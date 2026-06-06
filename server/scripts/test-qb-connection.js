/**
 * Tests the same QuickBooks path used by dashboard sync.
 * Prints only success/failure; never prints secrets.
 */
import "../config/loadEnv.js";
import { connectDb } from "../config/db.js";
import { qbConfig, validateQuickBooksConfig } from "../config/quickbooks.js";
import { fetchFinancialReports } from "../quickbooks/qbClient.js";

const missing = validateQuickBooksConfig();
if (missing.length) {
  console.error("FAIL - missing env:", missing.join(", "));
  process.exit(1);
}

const companyId = process.argv[2] || qbConfig.defaultCompanyId;

try {
  await connectDb();
  const reports = await fetchFinancialReports(companyId);

  if (!reports.profitAndLoss || !reports.balanceSheet) {
    throw new Error("QuickBooks did not return required financial reports");
  }

  console.log(`OK - QuickBooks OAuth + reports fetched for ${companyId}`);
  console.log(`PASS - Realm ${reports.realmId} is reachable with saved credentials`);
  process.exit(0);
} catch (err) {
  console.error("FAIL - QuickBooks connection:", err.message);
  process.exit(1);
}
