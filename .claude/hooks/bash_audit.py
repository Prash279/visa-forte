#!/usr/bin/env python3
"""PostToolUse hook: appends every Bash command to .claude/bash-audit.log."""
import sys
import json
import datetime
import os

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "").replace("\n", " ").strip()
timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Anchor the log to this script's own directory, never to os.getcwd(). Hooks run in
# whatever directory is current when they fire, so getcwd() scattered the audit trail —
# a worktree session wrote its own .claude/bash-audit.log and the main log silently
# missed those commands. An audit trail with invisible gaps is worse than none.
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bash-audit.log")
log_path = os.path.normpath(log_path)
with open(log_path, "a", encoding="utf-8") as f:
    f.write(f"{timestamp}  {command[:300]}\n")