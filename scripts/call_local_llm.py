#!/usr/bin/env python3
"""Helper script: pipe a prompt via stdin to the local LLM server and print the response.

Env vars:
  MODEL       — override model name (skips config file lookup)
  PORT        — override server port (skips config file lookup)
  MAX_TOKENS  — max output tokens (default 2000)
  IMAGE_PATH  — optional path to an image file (enables vision mode)
"""

import sys
import os
import json
import base64
import urllib.request

def load_preset():
    config_path = os.path.expanduser("~/.v23cc/config.json")
    if not os.path.exists(config_path):
        return None, None
    try:
        with open(config_path) as f:
            d = json.load(f)
        active = d.get("active", "")
        preset = d.get("models", {}).get(active)
        if preset:
            return preset.get("model"), preset.get("port")
    except Exception:
        pass
    return None, None

preset_model, preset_port = load_preset()

prompt = sys.stdin.read()
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

model = os.environ.get("MODEL") or preset_model or "mlx-community/gemma-4-e4b-it-4bit"
port = os.environ.get("PORT") or (str(preset_port) if preset_port else "9000")

payload = json.dumps({
    "model": model,
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
