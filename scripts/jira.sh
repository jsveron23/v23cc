#!/bin/bash
set -euo pipefail

CONFIG=~/.v23cc/config.json

if [ $# -lt 1 ]; then
  echo "Usage: jira.sh <ISSUE-KEY> [--branch] [--deep]"
  echo ""
  echo "  ISSUE-KEY  Jira issue key (e.g. WPN-123)"
  echo "  --branch   Create a git branch after analysis"
  echo "  --deep     Include source snippets in project context"
  exit 1
fi

ISSUE_KEY="$1"
shift

CREATE_BRANCH=""
DEEP_MODE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) CREATE_BRANCH="1"; shift ;;
    --deep)   DEEP_MODE="1";   shift ;;
    *) shift ;;
  esac
done

if ! [[ "$ISSUE_KEY" =~ ^[A-Z]+-[0-9]+$ ]]; then
  echo "Error: Invalid issue key format: $ISSUE_KEY"
  echo "Expected format: PROJECT-123 (uppercase letters, dash, number)"
  exit 1
fi

# --- Load credentials ---

if [ ! -f "$CONFIG" ]; then
  echo "Error: Atlassian not configured."
  echo "Run: /v23cc:atlassian init"
  exit 1
fi

eval "$(V23CC_CONFIG="$CONFIG" python3 -c "
import json, os, sys
d = json.load(open(os.environ['V23CC_CONFIG']))
a = d.get('atlassian')
if not a:
    print('echo \"Error: Atlassian not configured. Run: /v23cc:atlassian init\"; exit 1')
    sys.exit(0)
domain = a.get('domain', '').strip()
email  = a.get('email', '').strip()
token  = a.get('token', '').strip()
if not domain or not email or not token:
    print('echo \"Error: Atlassian credentials incomplete. Run: /v23cc:atlassian init\"; exit 1')
    sys.exit(0)
print(f'DOMAIN={domain}')
print(f'EMAIL={email}')
print(f'TOKEN={token}')
")"

# --- Fetch issue from Jira ---

echo "Fetching ${ISSUE_KEY}..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "${EMAIL}:${TOKEN}" \
  -H "Accept: application/json" \
  "https://${DOMAIN}.atlassian.net/rest/api/3/issue/${ISSUE_KEY}?expand=renderedFields")

HTTP_CODE=$(printf '%s' "$RESPONSE" | tail -1)
ISSUE_JSON=$(printf '%s' "$RESPONSE" | sed '$d')

case "$HTTP_CODE" in
  200) ;;
  404) echo "Error: Issue not found: ${ISSUE_KEY}"; exit 1 ;;
  401|403) echo "Error: Authentication failed. Check credentials with /v23cc:atlassian status"; exit 1 ;;
  *) echo "Error: Jira API returned HTTP ${HTTP_CODE}"; exit 1 ;;
esac

# --- Parse issue fields ---

ISSUE_DETAILS=$(V23CC_ISSUE_JSON="$ISSUE_JSON" python3 -c "
import json, os, re, html

raw = os.environ['V23CC_ISSUE_JSON']
d = json.loads(raw)
fields = d.get('fields', {})
rendered = d.get('renderedFields', {})

def strip_html(s):
    if not s:
        return ''
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.I)
    s = re.sub(r'</p>', '\n', s, flags=re.I)
    s = re.sub(r'</li>', '\n', s, flags=re.I)
    s = re.sub(r'<li[^>]*>', '- ', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()

summary    = fields.get('summary', '')
itype      = (fields.get('issuetype') or {}).get('name', 'Unknown')
priority   = (fields.get('priority') or {}).get('name', 'None')
status     = (fields.get('status') or {}).get('name', 'Unknown')
assignee   = (fields.get('assignee') or {}).get('displayName', 'Unassigned')
labels     = ', '.join(fields.get('labels') or []) or 'None'

desc_html = rendered.get('description') or ''
desc = strip_html(desc_html)
if len(desc) > 4000:
    desc = desc[:4000] + '\n...(truncated)'

links = fields.get('issuelinks') or []
link_lines = []
for lk in links:
    ltype = lk.get('type', {})
    if 'outwardIssue' in lk:
        rel = ltype.get('outward', 'relates to')
        other = lk['outwardIssue']
    elif 'inwardIssue' in lk:
        rel = ltype.get('inward', 'relates to')
        other = lk['inwardIssue']
    else:
        continue
    key2 = other.get('key', '')
    s2   = (other.get('fields') or {}).get('summary', '')
    link_lines.append(f'- {key2} ({rel}) — {s2}')

subtasks = fields.get('subtasks') or []
sub_lines = []
for st in subtasks:
    st_key = st.get('key', '')
    st_sum = (st.get('fields') or {}).get('summary', '')
    st_sts = ((st.get('fields') or {}).get('status') or {}).get('name', '')
    sub_lines.append(f'- {st_key} [{st_sts}] — {st_sum}')

parent = fields.get('parent')
parent_line = ''
if parent:
    p_key = parent.get('key', '')
    p_sum = (parent.get('fields') or {}).get('summary', '')
    parent_line = f'\nParent: {p_key} — {p_sum}'

out = f'Issue: {d[\"key\"]}\\nType: {itype}\\nPriority: {priority}\\nStatus: {status}\\nAssignee: {assignee}\\nLabels: {labels}\\n\\nSummary: {summary}\\n'
if desc:
    out += f'\\nDescription:\\n{desc}\\n'
if link_lines:
    out += f'\\nLinked Issues:\\n' + '\\n'.join(link_lines) + '\\n'
if sub_lines:
    out += f'\\nSubtasks:\\n' + '\\n'.join(sub_lines) + '\\n'
if parent_line:
    out += parent_line + '\\n'

print(out)
")

SUMMARY=$(V23CC_ISSUE_JSON="$ISSUE_JSON" python3 -c "
import json, os
d = json.loads(os.environ['V23CC_ISSUE_JSON'])
print(d.get('fields', {}).get('summary', ''))
")

ISSUE_TYPE=$(V23CC_ISSUE_JSON="$ISSUE_JSON" python3 -c "
import json, os
d = json.loads(os.environ['V23CC_ISSUE_JSON'])
print((d.get('fields', {}).get('issuetype') or {}).get('name', 'Task'))
")

ISSUE_LANG=$(V23CC_ISSUE_JSON="$ISSUE_JSON" python3 -c "
import json, os, re
d = json.loads(os.environ['V23CC_ISSUE_JSON'])
fields = d.get('fields', {})
summary = fields.get('summary') or ''
desc = fields.get('description')
desc_str = str(desc) if isinstance(desc, dict) else (desc or '')
text = summary + ' ' + desc_str
if re.search(r'[\uAC00-\uD7AF]', text):
    print('Korean (한국어)')
elif re.search(r'[\u3040-\u30FF]', text):
    print('Japanese (日本語)')
elif re.search(r'[\u4E00-\u9FFF]', text):
    print('Chinese (中文)')
else:
    print('English')
")

# --- Gather project context ---

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

read_if_exists() {
  if [ -f "$REPO_ROOT/$1" ]; then
    printf '=== %s ===\n' "$1"
    cat "$REPO_ROOT/$1"
    printf '\n'
  fi
}

EXTS=()
[ -f "$REPO_ROOT/package.json" ]                                               && EXTS+=(js ts jsx tsx mjs cjs)
[ -f "$REPO_ROOT/Cargo.toml" ]                                                 && EXTS+=(rs)
{ [ -f "$REPO_ROOT/pyproject.toml" ] || [ -f "$REPO_ROOT/setup.py" ] || [ -f "$REPO_ROOT/requirements.txt" ]; } && EXTS+=(py)
[ -f "$REPO_ROOT/go.mod" ]                                                     && EXTS+=(go)
{ [ -f "$REPO_ROOT/build.gradle" ] || [ -f "$REPO_ROOT/pom.xml" ]; }          && EXTS+=(java kt)
[ -f "$REPO_ROOT/CMakeLists.txt" ]                                             && EXTS+=(cpp c h hpp cc cxx)
[ -f "$REPO_ROOT/mix.exs" ]                                                    && EXTS+=(ex exs)
[ -f "$REPO_ROOT/composer.json" ]                                              && EXTS+=(php)
{ ls "$REPO_ROOT"/*.gemspec 2>/dev/null | grep -q . || [ -f "$REPO_ROOT/Gemfile" ]; } && EXTS+=(rb)

[ ${#EXTS[@]} -eq 0 ] && EXTS=(js ts py rs go java kt rb php cs swift)

EXTS+=(toml json yaml yml md sh)

FIND_NAME=()
first=true
for ext in "${EXTS[@]}"; do
  $first || FIND_NAME+=(-o)
  FIND_NAME+=(-name "*.$ext")
  first=false
done

TREE=$(find "$REPO_ROOT" \
  -not \( -path "*/node_modules/*" -o -path "*/.git/*" -o -path "*/target/*" \
         -o -path "*/dist/*" -o -path "*/.cargo/*" -o -path "*/coverage/*" \
         -o -path "*/__pycache__/*" -o -path "*/.venv/*" -o -path "*/vendor/*" \
         -o -path "*/.*/*" -o -path "*/v23cc/*" \) \
  -type f \( "${FIND_NAME[@]}" \) \
  | sed "s|$REPO_ROOT/||" | sort)

CONFIGS=""
CONFIGS+=$(read_if_exists "package.json")
CONFIGS+=$(read_if_exists "Cargo.toml")
CONFIGS+=$(read_if_exists "pyproject.toml")
CONFIGS+=$(read_if_exists "setup.py")
CONFIGS+=$(read_if_exists "go.mod")
CONFIGS+=$(read_if_exists "build.gradle")
CONFIGS+=$(read_if_exists "pom.xml")
CONFIGS+=$(read_if_exists "Makefile")
CONFIGS+=$(read_if_exists "CMakeLists.txt")

CONTEXT="=== File tree ===
$TREE

$CONFIGS"

if [ -n "$DEEP_MODE" ]; then
  SOURCES=""
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    SOURCES+="=== $file ==="$'\n'
    SOURCES+="$(head -10 "$REPO_ROOT/$file" 2>/dev/null || true)"$'\n\n'
  done <<< "$TREE"
  CONTEXT="$CONTEXT
=== Source snippets (first 10 lines each) ===
$SOURCES"
fi

CONTEXT_LEN=${#CONTEXT}
if [ "$CONTEXT_LEN" -gt 10000 ]; then
  CONTEXT=$(printf '%s' "$CONTEXT" | cut -c1-10000)
  CONTEXT="$CONTEXT
...(truncated)"
fi

# --- Analyze with local LLM ---

echo "Analyzing ${ISSUE_KEY} with LLM..."
echo ""

SYSTEM="You are a senior software architect analyzing a Jira issue for implementation feasibility.
CRITICAL: You MUST write your ENTIRE response in ${ISSUE_LANG}. Every word, every heading, every sentence must be in ${ISSUE_LANG}. Do not use English unless ${ISSUE_LANG} is English.

Given the Jira issue details and the current project's file structure, provide a structured analysis:

## Requirements Analysis
- Summarize the issue requirements in clear, technical terms
- List acceptance criteria (explicit and implied)

## Feasibility Assessment
- Can this be implemented with the current codebase? (Yes / Partially / No)
- Estimated complexity: Low / Medium / High
- Key risks or unknowns

## Implementation Approach
- Step-by-step plan referencing specific files to create or modify
- For each step, describe what changes are needed
- Note any new dependencies required

## Suggested Branch Name
- Follow the pattern: <type>/<ISSUE-KEY>-<short-description>
  - type: feature (Story/Epic), fix (Bug), chore (Task/Sub-task), refactor
  - Example: feature/WPN-123-camera-ui-update
- Output the branch name on its own line inside a code block

Be specific — reference actual files and paths from the project tree. Output in markdown."

RESULT=$(printf '%s' "=== Jira Issue ===
$ISSUE_DETAILS

=== Project Context ===
$CONTEXT" | SYSTEM="$SYSTEM" MAX_TOKENS=4000 ~/.v23cc/call_local_llm.py)

if [ -z "$RESULT" ]; then
  echo "Error: LLM returned empty result." >&2
  exit 1
fi

echo "$RESULT"

# --- Save output ---

JIRA_DIR="$REPO_ROOT/v23cc/jira"
mkdir -p "$JIRA_DIR"
OUTFILE="$JIRA_DIR/${ISSUE_KEY}.md"
ISSUE_URL="https://${DOMAIN}.atlassian.net/browse/${ISSUE_KEY}"

printf '# %s — %s\n\n> Source: %s\n> Analyzed: %s\n\n%s\n' \
  "$ISSUE_KEY" "$SUMMARY" "$ISSUE_URL" "$(date '+%Y-%m-%d %H:%M')" "$RESULT" > "$OUTFILE"

echo ""
echo "Saved: v23cc/jira/${ISSUE_KEY}.md"

# --- Optional: create branch ---

if [ -n "$CREATE_BRANCH" ]; then
  BRANCH_NAME=$(printf '%s' "$RESULT" | grep -oE '(feature|fix|chore|refactor|hotfix)/[A-Za-z]+-[0-9]+-[a-z0-9-]+' | head -1)

  if [ -z "$BRANCH_NAME" ]; then
    TYPE_LOWER=$(printf '%s' "$ISSUE_TYPE" | tr '[:upper:]' '[:lower:]')
    case "$TYPE_LOWER" in
      bug)            PREFIX="fix" ;;
      story|epic)     PREFIX="feature" ;;
      sub-task)       PREFIX="chore" ;;
      *)              PREFIX="chore" ;;
    esac
    SLUG=$(printf '%s' "$SUMMARY" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-40)
    BRANCH_NAME="${PREFIX}/${ISSUE_KEY}-${SLUG}"
  fi

  echo ""
  if git checkout -b "$BRANCH_NAME" 2>/dev/null; then
    echo "Branch created: $BRANCH_NAME"
  else
    echo "Warning: Could not create branch '$BRANCH_NAME' (may already exist)."
    echo "To create manually: git checkout -b $BRANCH_NAME"
  fi
fi
