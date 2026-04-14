#!/bin/bash
set -euo pipefail

CONFIG=~/.v23cc/config.json

show_state() {
  if [ ! -f "$CONFIG" ]; then
    echo "No config found. Run: /v23cc:model add <name> <model-id> [port]"
    return
  fi
  ACTIVE=$(python3 -c "import json,sys; d=json.load(open('$CONFIG')); print(d.get('active','(none)'))")
  echo "Active: $ACTIVE"
  echo ""
  python3 -c "
import json
d = json.load(open('$CONFIG'))
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
    python3 -c "
import json, sys
d = json.load(open('$CONFIG'))
if '$NAME' not in d.get('models', {}):
    print('Preset not found: $NAME')
    sys.exit(1)
d['active'] = '$NAME'
json.dump(d, open('$CONFIG', 'w'), indent=2)
print(f'Active preset set to: $NAME')
cfg = d['models']['$NAME']
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
    python3 -c "
import json, os
path = '$CONFIG'
d = json.load(open(path)) if os.path.exists(path) else {'active': '', 'models': {}}
d.setdefault('models', {})['$NAME'] = {'model': '$MODEL_ID', 'port': int('$PORT')}
if not d.get('active'):
    d['active'] = '$NAME'
json.dump(d, open(path, 'w'), indent=2)
print(f'Preset added: $NAME')
print(f'  model=$MODEL_ID  port=$PORT')
if d['active'] == '$NAME':
    print(f'  (set as active)')
"
    echo ""
    show_state
    ;;

  remove)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then echo "Usage: /v23cc:model remove <name>"; exit 1; fi
    if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
    python3 -c "
import json, sys
d = json.load(open('$CONFIG'))
if '$NAME' not in d.get('models', {}):
    print('Preset not found: $NAME')
    sys.exit(1)
del d['models']['$NAME']
if d.get('active') == '$NAME':
    d['active'] = next(iter(d['models']), '')
    print(f'Active preset cleared (was $NAME)')
json.dump(d, open('$CONFIG', 'w'), indent=2)
print(f'Removed preset: $NAME')
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
