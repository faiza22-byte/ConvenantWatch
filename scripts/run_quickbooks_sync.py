#!/usr/bin/env python3
"""Run one QuickBooks → MongoDB covenant sync immediately."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from quickbooks.sync import main

if __name__ == "__main__":
    raise SystemExit(main())
