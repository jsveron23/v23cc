#!/bin/bash
set -euo pipefail

CONFIG=~/.v23cc/config.json

show_state() {
  if [ ! -f "$CONFIG" ]; then
    echo "No config found. Run: /<namespace>:model add <name> <model-id> [endpoint]"
    return
  fi
  V23CC_CONFIG="$CONFIG" python3 -c "
import json, os
config = os.environ['V23CC_CONFIG']
d = json.load(open(config))
if 'active' in d:
    active_name = d.pop('active')
    for n, cfg in d.get('models', {}).items():
        cfg['active'] = (n == active_name)
    json.dump(d, open(config, 'w'), indent=2)
models = d.get('models', {})
active_name = next((n for n, c in models.items() if c.get('active')), '(none)')
print(f'Active: {active_name}')
print()
for name, cfg in models.items():
    marker = '* ' if cfg.get('active') else '  '
    protocol = cfg.get('protocol', 'http')
    host = cfg.get('host', 'localhost')
    port = cfg.get('port', 9000)
    print(f'{marker}{name}  {cfg[\"model\"]}  {protocol}://{host}:{port}')
"
}

CMD="${1:-}"

case "$CMD" in
  "" | list)
    show_state
    ;;

  use)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then echo "Usage: /<namespace>:model use <name>"; exit 1; fi
    if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
    V23CC_CONFIG="$CONFIG" V23CC_NAME="$NAME" python3 -c "
import json, sys, os
config = os.environ['V23CC_CONFIG']
name = os.environ['V23CC_NAME']
d = json.load(open(config))
if 'active' in d:
    active_name = d.pop('active')
    for n, cfg in d.get('models', {}).items():
        cfg['active'] = (n == active_name)
if name not in d.get('models', {}):
    print('Preset not found: ' + name)
    sys.exit(1)
for n, cfg in d['models'].items():
    cfg['active'] = (n == name)
json.dump(d, open(config, 'w'), indent=2)
print(f'Active preset set to: {name}')
cfg = d['models'][name]
protocol = cfg.get('protocol', 'http')
host = cfg.get('host', 'localhost')
port = cfg.get('port', 9000)
print(f'  model={cfg[\"model\"]}  {protocol}://{host}:{port}')
"
    echo ""
    show_state
    ;;

  add)
    NAME="${2:-}"
    MODEL_ID="${3:-}"
    ENDPOINT="${4:-}"
    if [ -z "$NAME" ] || [ -z "$MODEL_ID" ]; then
      echo "Usage: /<namespace>:model add <name> <model-id> [endpoint]"
      exit 1
    fi
    mkdir -p ~/.v23cc
    V23CC_CONFIG="$CONFIG" V23CC_NAME="$NAME" V23CC_MODEL="$MODEL_ID" V23CC_ENDPOINT="$ENDPOINT" python3 -c "
import json, os, re, sys
config = os.environ['V23CC_CONFIG']
name = os.environ['V23CC_NAME']
model_id = os.environ['V23CC_MODEL']
endpoint = os.environ.get('V23CC_ENDPOINT', '').strip()

if re.match(r'^https?://', endpoint):
    m = re.match(r'^(https?)://([^:/]+)(?::(\d+))?', endpoint)
    if not m:
        print(f'Invalid endpoint: {endpoint}', file=sys.stderr)
        sys.exit(1)
    protocol = m.group(1)
    host = m.group(2)
    port = int(m.group(3)) if m.group(3) else (443 if protocol == 'https' else 80)
elif re.match(r'^\d+$', endpoint):
    protocol, host, port = 'http', 'localhost', int(endpoint)
elif endpoint:
    m = re.match(r'^([^:]+)(?::(\d+))?$', endpoint)
    protocol = 'http'
    host = m.group(1)
    port = int(m.group(2)) if m.group(2) else 9000
else:
    protocol, host, port = 'http', 'localhost', 9000

d = json.load(open(config)) if os.path.exists(config) else {'models': {}}
if 'active' in d:
    active_name = d.pop('active')
    for n, cfg in d.get('models', {}).items():
        cfg['active'] = (n == active_name)
models = d.setdefault('models', {})
has_active = any(c.get('active') for c in models.values())
models[name] = {'model': model_id, 'protocol': protocol, 'host': host, 'port': port, 'active': not has_active}
json.dump(d, open(config, 'w'), indent=2)
print(f'Preset added: {name}')
print(f'  model={model_id}  {protocol}://{host}:{port}')
if models[name]['active']:
    print(f'  (set as active)')
"
    echo ""
    show_state
    ;;

  remove)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then echo "Usage: /<namespace>:model remove <name>"; exit 1; fi
    if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
    V23CC_CONFIG="$CONFIG" V23CC_NAME="$NAME" python3 -c "
import json, sys, os
config = os.environ['V23CC_CONFIG']
name = os.environ['V23CC_NAME']
d = json.load(open(config))
if 'active' in d:
    active_name = d.pop('active')
    for n, cfg in d.get('models', {}).items():
        cfg['active'] = (n == active_name)
if name not in d.get('models', {}):
    print('Preset not found: ' + name)
    sys.exit(1)
was_active = d['models'][name].get('active', False)
del d['models'][name]
if was_active and d['models']:
    first = next(iter(d['models']))
    d['models'][first]['active'] = True
    print(f'Active preset cleared (was {name}), now: {first}')
json.dump(d, open(config, 'w'), indent=2)
print(f'Removed preset: {name}')
"
    echo ""
    show_state
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Usage: /<namespace>:model [list | use <name> | add <name> <model-id> [endpoint] | remove <name>]"
    exit 1
    ;;
esac
