import "../config/loadEnv.js";
import { connectDb } from "../config/db.js";
import { qbConfig } from "../config/quickbooks.js";
import { runQuickBooksSync } from "../quickbooks/syncService.js";

const companyId = process.argv[2] || qbConfig.defaultCompanyId;
const startDate = process.argv[3];
const endDate = process.argv[4];

try {
  await connectDb();
  await runQuickBooksSync(companyId, { startDate, endDate });
  process.exit(0);
} catch (err) {
  console.error("QuickBooks sync failed:", err.message);
  process.exit(1);
}
