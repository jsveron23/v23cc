#!/bin/bash
set -euo pipefail

ARGS="${*}"
MAX_LINES="100"
KEEP_SECTION=""
[[ "$ARGS" =~ --lines[[:space:]]+([0-9]+) ]] && MAX_LINES="${BASH_REMATCH[1]}"
KEEP_PATTERN='--keep[[:space:]]+([^ ]+)'
[[ "$ARGS" =~ $KEEP_PATTERN ]] && KEEP_SECTION="${BASH_REMATCH[1]}"

KEEP_RULE=""
[ -n "$KEEP_SECTION" ] && KEEP_RULE="- Do NOT remove or modify the '$KEEP_SECTION' section — copy it exactly as-is"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
README_FILE="$REPO_ROOT/README.md"
CLAUDE_FILE="$REPO_ROOT/CLAUDE.md"

if [ ! -f "$CLAUDE_FILE" ]; then
  echo "Error: CLAUDE.md not found. Create one first (e.g. via Claude Code /init)."
  exit 1
fi

read_if_exists() {
  if [ -f "$REPO_ROOT/$1" ]; then
    echo "=== $1 ==="
    cat "$REPO_ROOT/$1"
    echo ""
  fi
}

echo "Reading project..."

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
         -o -path "*/__pycache__/*" -o -path "*/.venv/*" -o -path "*/vendor/*" \) \
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

echo "Updating README.md..."

if [ -f "$README_FILE" ]; then
  README_PROMPT="You are updating a project's README.md based on its current source code.

$CONTEXT

=== Current README.md ===
$(cat "$README_FILE")

Instructions:
- Human-facing documentation
- Explain what the project does and how to run it
- Keep the existing structure; update only what is outdated or missing
- Do not add fabricated details — only use what the source code shows
- Output the full updated README.md content only — no explanation, no markdown code fences"
else
  README_PROMPT="You are creating a README.md for a new project based on its source code.

$CONTEXT

Instructions:
- Human-facing documentation
- Explain what the project does, how to install it, and how to run it
- Do not add fabricated details — only use what the source code shows
- Output the full README.md content only — no explanation, no markdown code fences"
fi

printf '%s' "$README_PROMPT" | MAX_TOKENS=4000 ~/.v23cc/call_local_llm.py > "$README_FILE"
echo "  Done → README.md"

echo "Updating CLAUDE.md..."

CLAUDE_PROMPT="You are updating a project's CLAUDE.md (AI-facing docs) based on its current source code.

$CONTEXT

=== Current CLAUDE.md ===
$(cat "$CLAUDE_FILE")

Instructions:
- AI-facing documentation only — keep it under $MAX_LINES lines
$KEEP_RULE
- Link to README.md instead of duplicating what is already there
- Only update the Project Overview, Architecture, and Commands sections if they are outdated
- Do not add fabricated details — only use what the source code shows
- Output the full updated CLAUDE.md content only — no explanation, no markdown code fences"

printf '%s' "$CLAUDE_PROMPT" | MAX_TOKENS=3000 ~/.v23cc/call_local_llm.py > "$CLAUDE_FILE"
echo "  Done → CLAUDE.md"

echo ""
echo "Both docs updated. Review with: git diff README.md CLAUDE.md"
