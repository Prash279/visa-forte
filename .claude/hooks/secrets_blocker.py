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

    import re

    PATTERNS = [
        (r'sk-ant-[A-Za-z0-9_-]{20,}',                          'Anthropic API key'),
        (r'sk_live_[A-Za-z0-9]{20,}',                            'Stripe live secret key'),
        (r'sk_test_[A-Za-z0-9]{20,}',                            'Stripe test secret key'),
        (r'rk_live_[A-Za-z0-9]{20,}',                            'Stripe restricted key'),
        (r'sk-[A-Za-z0-9]{32,}',                                  'OpenAI-style API key'),
        (r'AKIA[0-9A-Z]{16}',                                      'AWS access key'),
        (r'ghp_[A-Za-z0-9]{36}',                                  'GitHub personal access token'),
        (r'ghs_[A-Za-z0-9]{36}',                                  'GitHub app token'),
        (r'-----BEGIN (?:RSA |EC )?PRIVATE KEY',                  'Private key material'),
        (r'(?:postgresql|mysql|mongodb)://[^:\s]+:[^@\s]{4,}@',  'DB connection string with credentials'),
        (r'(?i)password\s*[=:]\s*["\'][^"\']{8,}["\']',          'Hardcoded password'),
    ]

    ALLOWLIST = [
        r'sk_live_YOUR', r'sk_test_YOUR', r'sk-ant-YOUR',
        r'process\.env\.', r'os\.environ',
        r'placeholder', r'example', r'YOUR_KEY', r'REPLACE_ME',
    ]

    def is_allowlisted(text: str) -> bool:
        return any(re.search(p, text, re.IGNORECASE) for p in ALLOWLIST)

    for pattern, label in PATTERNS:
        match = re.search(pattern, content)
        if match and not is_allowlisted(match.group(0)):
            print(json.dumps({"decision": "block", "reason": f"[SECRETS SEGREGATION] {label} detected. Use process.env / os.environ — never hardcode credentials. See ~/.claude/rules/security-secrets-segregation.md"}))
            sys.exit(0)

    # Allow the tool call
    sys.exit(0)

if __name__ == "__main__":
    main()
