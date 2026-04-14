# v23cc

A lightweight Claude Code workflow system by jsveron23, powered by a local LLM.

Spec-driven, context-safe, and minimal. Runs on a local LLM server — no cloud API required.

## Install

```bash
# Global (works in all projects)
bunx v23cc@latest --global

# Local (current project only)
bunx v23cc@latest --local
```

## Commands

| Command | Description |
|---------|-------------|
| `/plan [task]` | Break down a task into atomic plans |
| `/execute` | Execute plans using subagents (keeps context clean) |
| `/review [file?]` | Code style & quality review |
| `/status` | Show current plan state |

## Workflow

```
/plan add user authentication
  → creates .v23cc/PLAN.md

/status
  → shows waves and tasks

/execute
  → runs each task in a fresh subagent context
  → commits after each task

/review
  → reviews the diff
```

## Why subagents?

Claude's context window fills up as it works. When context fills, quality drops ("context rot").

v23cc runs each task in a fresh subagent context via Claude Code's Task tool — so the main session stays light and fast, no matter how much work gets done.

## Local LLM (optional)

You can pipe prompts to a local LLM server before invoking v23cc commands. Save the script below and run your local server (e.g. [mlx-lm](https://github.com/ml-explore/mlx-lm)) on port 9000 first.

```python
#!/usr/bin/env python3
"""Helper script: pipe a prompt via stdin to the local LLM server and print the response.

Env vars:
  PORT        — local LLM server port (default 9000)
  MAX_TOKENS  — max output tokens (default 2000)
  IMAGE_PATH  — optional path to an image file (enables vision mode)
"""

import sys
import os
import json
import base64
import urllib.request

prompt = sys.stdin.read()
port = os.environ.get("PORT", "9000")
image_path = os.environ.get("IMAGE_PATH", "")

# Build message content
if image_path and os.path.isfile(image_path):
    ext = os.path.splitext(image_path)[1].lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "gif": "image/gif", "webp": "image/webp"}.get(ext, "image/png")
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    content = [
        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
        {"type": "text", "text": prompt},
    ]
else:
    content = prompt.encode('utf-8', errors='ignore').decode('utf-8')

payload = json.dumps({
    "model": "mlx-community/gemma-4-e4b-it-4bit",
    "messages": [{"role": "user", "content": content}],
    "max_tokens": int(os.environ.get("MAX_TOKENS", 2000))
}).encode()

req = urllib.request.Request(
    f"http://localhost:{port}/v1/chat/completions",
    data=payload,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.load(res)
        print(data["choices"][0]["message"]["content"])
except urllib.error.HTTPError as e:
    body = e.read().decode(errors="replace")
    print(f"Server error ({e.code}): {body[:500]}", file=sys.stderr)
except urllib.error.URLError:
    print(f"Local server (port {port}) is not running.", file=sys.stderr)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
```

```bash
# Example usage
echo "Summarize this file" | python llm.py
IMAGE_PATH=screenshot.png echo "What's in this image?" | python llm.py
MAX_TOKENS=500 echo "Short answer only" | python llm.py
```

## Uninstall

```bash
bunx v23cc@latest --global --uninstall
bunx v23cc@latest --local --uninstall
```

## License

MIT
