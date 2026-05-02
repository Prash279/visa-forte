import sys
import json
import os

def main():
    try:
        input_data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only scan file content for secrets
    content = ""
    if tool_name == "Write":
        content = str(tool_input.get("content", ""))
    elif tool_name == "Edit":
        content = str(tool_input.get("new_string", ""))
    elif tool_name == "Bash":
        content = str(tool_input.get("command", ""))

    # Patterns that suggest real secrets (not test values or env var references)
    import re
    patterns = [
        r'sk-ant-[A-Za-z0-9_-]{20,}',          # Anthropic API key
        r'sk-[A-Za-z0-9]{20,}',                  # OpenAI-style key
        r'AKIA[0-9A-Z]{16}',                      # AWS access key
        r'(?i)password\s*=\s*["\'][^"\']{8,}["\']',  # Hardcoded password
    ]

    for pattern in patterns:
        if re.search(pattern, content):
            print(json.dumps({"decision": "block", "reason": f"Possible secret detected (pattern: {pattern[:40]}). Review before proceeding."}))
            sys.exit(0)

    # Allow the tool call
    sys.exit(0)

if __name__ == "__main__":
    main()
