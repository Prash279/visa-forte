#!/usr/bin/env python3
"""PostToolUse hook: appends every Bash command to .claude/bash-audit.log."""
import sys
import json
import datetime
import os

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "").replace("\n", " ").strip()
timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

log_path = os.path.join(os.getcwd(), ".claude", "bash-audit.log")
with open(log_path, "a", encoding="utf-8") as f:
    f.write(f"{timestamp}  {command[:300]}\n")