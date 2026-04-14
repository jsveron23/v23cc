#!/bin/bash
set -euo pipefail

CONFIG=~/.v23cc/config.json

show_state() {
  if [ ! -f "$CONFIG" ]; then
    echo "No config found. Run: /v23cc:model add <name> <model-id> [port]"
    return
  fi
  ACTIVE=$(V23CC_CONFIG="$CONFIG" python3 -c "import json,sys,os; d=json.load(open(os.environ['V23CC_CONFIG'])); print(d.get('active','(none)'))")
  echo "Active: $ACTIVE"
  echo ""
  V23CC_CONFIG="$CONFIG" python3 -c "
import json, os
d = json.load(open(os.environ['V23CC_CONFIG']))
models = d.get('models', {})
active = d.get('active', '')
for name, cfg in models.items():
    marker = '* ' if name == active else '  '
    print(f'{marker}{name}  {cfg[\"model\"]}  port={cfg[\"port\"]}')
"
}

CMD="${1:-}"

case "$CMD" in
  "" | list)
    show_state
    ;;

  use)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then echo "Usage: /v23cc:model use <name>"; exit 1; fi
    if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
    V23CC_CONFIG="$CONFIG" V23CC_NAME="$NAME" python3 -c "
import json, sys, os
config = os.environ['V23CC_CONFIG']
name = os.environ['V23CC_NAME']
d = json.load(open(config))
if name not in d.get('models', {}):
    print('Preset not found: ' + name)
    sys.exit(1)
d['active'] = name
json.dump(d, open(config, 'w'), indent=2)
print(f'Active preset set to: {name}')
cfg = d['models'][name]
print(f'  model={cfg[\"model\"]}  port={cfg[\"port\"]}')
"
    echo ""
    show_state
    ;;

  add)
    NAME="${2:-}"
    MODEL_ID="${3:-}"
    PORT="${4:-9000}"
    if [ -z "$NAME" ] || [ -z "$MODEL_ID" ]; then
      echo "Usage: /v23cc:model add <name> <model-id> [port]"
      exit 1
    fi
    mkdir -p ~/.v23cc
    V23CC_CONFIG="$CONFIG" V23CC_NAME="$NAME" V23CC_MODEL="$MODEL_ID" V23CC_PORT="$PORT" python3 -c "
import json, os
config = os.environ['V23CC_CONFIG']
name = os.environ['V23CC_NAME']
model_id = os.environ['V23CC_MODEL']
port = int(os.environ['V23CC_PORT'])
d = json.load(open(config)) if os.path.exists(config) else {'active': '', 'models': {}}
d.setdefault('models', {})[name] = {'model': model_id, 'port': port}
if not d.get('active'):
    d['active'] = name
json.dump(d, open(config, 'w'), indent=2)
print(f'Preset added: {name}')
print(f'  model={model_id}  port={port}')
if d['active'] == name:
    print(f'  (set as active)')
"
    echo ""
    show_state
    ;;

  remove)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then echo "Usage: /v23cc:model remove <name>"; exit 1; fi
    if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
    V23CC_CONFIG="$CONFIG" V23CC_NAME="$NAME" python3 -c "
import json, sys, os
config = os.environ['V23CC_CONFIG']
name = os.environ['V23CC_NAME']
d = json.load(open(config))
if name not in d.get('models', {}):
    print('Preset not found: ' + name)
    sys.exit(1)
del d['models'][name]
if d.get('active') == name:
    d['active'] = next(iter(d['models']), '')
    print(f'Active preset cleared (was {name})')
json.dump(d, open(config, 'w'), indent=2)
print(f'Removed preset: {name}')
"
    echo ""
    show_state
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Usage: /v23cc:model [list | use <name> | add <name> <model-id> [port] | remove <name>]"
    exit 1
    ;;
esac
