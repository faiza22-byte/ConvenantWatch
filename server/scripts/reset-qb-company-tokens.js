/**
 * Clears stored QuickBooks OAuth tokens for a company so sync uses .env again.
 * Usage: node server/scripts/reset-qb-company-tokens.js [companyId]
 */
import "../config/loadEnv.js";
import { connectDb } from "../config/db.js";
import { Company } from "../models/Company.js";
import { clearAccessTokenCache } from "../quickbooks/qbClient.js";
import { qbConfig } from "../config/quickbooks.js";

const companyId = process.argv[2] || qbConfig.defaultCompanyId || "acme";

await connectDb();
clearAccessTokenCache(companyId);

const result = await Company.updateOne(
  { companyId },
  {
    $set: { "quickbooks.connected": false, "quickbooks.lastSyncError": null },
    $unset: {
      "quickbooks.refreshTokenEncrypted": "",
      "quickbooks.connectedAt": "",
    },
  },
);

if (result.matchedCount === 0) {
  console.error(`Company "${companyId}" not found`);
  process.exit(1);
}

console.log(`Cleared QuickBooks OAuth tokens for "${companyId}".`);
console.log("Sync will use QUICKBOOKS_REALM_ID and QUICKBOOKS_REFRESH_TOKEN from .env.");
process.exit(0);
