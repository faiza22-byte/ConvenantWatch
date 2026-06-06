#!/usr/bin/env python3
"""
Schedule QuickBooks covenant sync at 2:00 AM local time for the next 3 nights.

Usage:
  python scripts/schedule_quickbooks_sync.py           # wait until 2 AM × 3 runs
  python scripts/schedule_quickbooks_sync.py --run-now # sync now, then 2 AM × 3
  python scripts/schedule_quickbooks_sync.py --runs 3  # override run count
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

sys.path.insert(0, str(Path(__file__).resolve().parent))

from quickbooks.sync import run_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("qb-scheduler")

runs_completed = 0
max_runs = 3
scheduled_company_id: str | None = None


def sync_job(scheduler: BlockingScheduler) -> None:
    global runs_completed
    runs_completed += 1
    log.info("Starting scheduled QuickBooks sync (%s/%s)", runs_completed, max_runs)
    try:
        run_sync(scheduled_company_id)
        log.info("Scheduled sync finished successfully")
    except Exception as exc:
        log.error("Scheduled sync failed: %s", exc)

    if runs_completed >= max_runs:
        log.info("Completed %s scheduled syncs — stopping scheduler", max_runs)
        scheduler.shutdown(wait=False)


def main() -> int:
    global max_runs, scheduled_company_id

    parser = argparse.ArgumentParser(description="Schedule QuickBooks nightly sync")
    parser.add_argument(
        "--run-now",
        action="store_true",
        help="Run sync immediately before starting the 2 AM schedule",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="Number of nightly syncs at 2:00 AM (default: 3)",
    )
    parser.add_argument(
        "--company-id",
        type=str,
        default=None,
        help="MongoDB companyId to update (default: QUICKBOOKS_DEFAULT_COMPANY_ID or acme)",
    )
    args = parser.parse_args()
    max_runs = max(1, args.runs)
    scheduled_company_id = args.company_id

    if args.run_now:
        log.info("Running immediate QuickBooks sync…")
        try:
            run_sync(args.company_id)
        except Exception as exc:
            log.error("Immediate sync failed: %s", exc)
            return 1

    scheduler = BlockingScheduler()

    def job() -> None:
        sync_job(scheduler)

    scheduler.add_job(
        job,
        CronTrigger(hour=2, minute=0),
        id="quickbooks_nightly",
        name="QuickBooks covenant sync at 2:00 AM",
    )

    next_run = scheduler.get_jobs()[0].next_run_time
    log.info(
        "Scheduler started — %s sync(s) at 2:00 AM local time. Next run: %s. Press Ctrl+C to stop.",
        max_runs,
        next_run,
    )
    log.info("Today is %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped by user")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
