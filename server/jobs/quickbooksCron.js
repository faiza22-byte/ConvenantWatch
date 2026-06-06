import cron from "node-cron";
import { Company } from "../models/Company.js";
import { validateQuickBooksConfig } from "../config/quickbooks.js";
import { runQuickBooksSync } from "../quickbooks/syncService.js";

let runsCompleted = 0;
let cronTask = null;

function maxRuns() {
  return Math.max(1, Number(process.env.QB_CRON_MAX_RUNS || 4));
}

function isEnabled() {
  return process.env.ENABLE_QB_CRON !== "false";
}

async function executeSync(label) {
  const missing = validateQuickBooksConfig();
  if (missing.length) {
    console.warn(`[QB Cron] Skipped (${label}): missing ${missing.join(", ")}`);
    return false;
  }

  try {
    const companies = await Company.find({
      "quickbooks.connected": true,
      "quickbooks.refreshTokenEncrypted": { $exists: true, $ne: "" },
    })
      .select("companyId name")
      .lean();
    if (!companies.length) {
      console.warn(`[QB Cron] Skipped (${label}): no company linked to QuickBooks realm`);
      return false;
    }

    let ok = true;
    for (const company of companies) {
      try {
        await runQuickBooksSync(company.companyId);
      } catch (err) {
        console.error(`[QB Cron] ${label} failed for ${company.companyId}:`, err.message);
        ok = false;
      }
    }
    return ok;
  } catch (err) {
    console.error(`[QB Cron] ${label} failed:`, err.message);
    return false;
  }
}

function stopIfDone() {
  if (runsCompleted >= maxRuns() && cronTask) {
    console.log(`[QB Cron] Finished ${runsCompleted}/${maxRuns()} scheduled syncs — cron stopped`);
    cronTask.stop();
    cronTask = null;
  }
}

export function startQuickBooksCron() {
  if (!isEnabled()) {
    console.log("[QB Cron] Disabled (set ENABLE_QB_CRON=true to enable)");
    return;
  }

  const schedule = process.env.QB_CRON_SCHEDULE || "0 2 * * *";
  const timezone = process.env.QB_CRON_TIMEZONE || undefined;

  if (!cron.validate(schedule)) {
    console.error(`[QB Cron] Invalid QB_CRON_SCHEDULE: "${schedule}"`);
    return;
  }

  runsCompleted = 0;

  cronTask = cron.schedule(
    schedule,
    async () => {
      runsCompleted += 1;
      console.log(`[QB Cron] Nightly sync ${runsCompleted}/${maxRuns()} at ${new Date().toISOString()}`);
      await executeSync("scheduled");
      stopIfDone();
    },
    { timezone },
  );

  console.log(
    `[QB Cron] Scheduled "${schedule}"${timezone ? ` (${timezone})` : ""} — ${maxRuns()} run(s)`,
  );

  if (process.env.QB_CRON_RUN_ON_START === "true") {
    executeSync("startup").catch(() => {});
  }
}

export async function runQuickBooksSyncOnce(companyId) {
  return runQuickBooksSync(companyId);
}
