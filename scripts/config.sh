#!/bin/bash
set -euo pipefail

CONFIG=~/.v23cc/config.json

if [ ! -f "$CONFIG" ]; then
  echo "No config found at $CONFIG"
  echo "Run: /v23cc:model add <name> <model-id> [port]"
  exit 0
fi

python3 -c "
import json, os
config = os.path.expanduser('~/.v23cc/config.json')
d = json.load(open(config))
print(json.dumps(d, indent=2))
"
