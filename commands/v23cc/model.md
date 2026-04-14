---
name: v23cc:model
description: Manage local LLM models (list, use, add, remove)
allowed-tools: Bash
model: haiku
---

Manage local LLM models stored in `~/.v23cc/config.json`.

Arguments: $ARGUMENTS

Config file location: `~/.v23cc/config.json`

Config schema:
```json
{
  "active": "<preset-name>",
  "models": {
    "<name>": { "model": "<model-id>", "port": 9000 }
  }
}
```

Parse $ARGUMENTS and run the appropriate bash command:

---

**No args** — show active preset and all models:
```bash
CONFIG=~/.v23cc/config.json
if [ ! -f "$CONFIG" ]; then
  echo "No config found. Run: /v23cc:model add <name> <model-id> [port]"
  exit 0
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
```

---

**`list`** — same as no args.

---

**`use <name>`** — set the active preset:
```bash
NAME="<parsed-name>"
CONFIG=~/.v23cc/config.json
mkdir -p ~/.v23cc
if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
python3 -c "
import json
d = json.load(open('$CONFIG'))
if '$NAME' not in d.get('models', {}):
    print('Preset not found: $NAME')
    exit(1)
d['active'] = '$NAME'
json.dump(d, open('$CONFIG', 'w'), indent=2)
print(f'Active preset set to: $NAME')
cfg = d['models']['$NAME']
print(f'  model={cfg[\"model\"]}  port={cfg[\"port\"]}')
"
```

---

**`add <name> <model-id> [port]`** — add or update a preset (port defaults to 9000):
```bash
NAME="<parsed-name>"
MODEL_ID="<parsed-model-id>"
PORT="<parsed-port-or-9000>"
CONFIG=~/.v23cc/config.json
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
```

---

**`remove <name>`** — remove a preset:
```bash
NAME="<parsed-name>"
CONFIG=~/.v23cc/config.json
if [ ! -f "$CONFIG" ]; then echo "No config found."; exit 1; fi
python3 -c "
import json
d = json.load(open('$CONFIG'))
if '$NAME' not in d.get('models', {}):
    print('Preset not found: $NAME')
    exit(1)
del d['models']['$NAME']
if d.get('active') == '$NAME':
    d['active'] = next(iter(d['models']), '')
    print(f'Active preset cleared (was $NAME)')
json.dump(d, open('$CONFIG', 'w'), indent=2)
print(f'Removed preset: $NAME')
"
```

---

After running the command, show a summary of the current state (active preset + list).

> **Tip:** `call_local_llm.py` reads the active preset from `~/.v23cc/config.json` when no `MODEL` env var is set.
