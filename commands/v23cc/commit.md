---
name: v23cc:commit
description: Generate a commit message using the local LLM
allowed-tools: Bash
model: haiku
---

Generate a single-line git commit message from staged (or unstaged) changes using the local LLM, then commit.

**Usage:** `/v23cc:commit [--max 72] [--no-prefix] [--only-msg] [--all]`

Arguments: $ARGUMENTS

Parse the arguments: optional `--max <number>` (default: `72`), optional `--no-prefix` flag, optional `--only-msg` flag (print message only, no commit), optional `--all` flag (run `git add *` before committing).

Run the following bash script via the Bash tool:

```bash
#!/bin/bash
set -euo pipefail

ARGS="$ARGUMENTS"
MAX="72"
NO_PREFIX=""
ONLY_MSG=""
ADD_ALL=""

[[ "$ARGS" == *"--no-prefix"* ]] && NO_PREFIX="1"
[[ "$ARGS" == *"--only-msg"* ]] && ONLY_MSG="1"
[[ "$ARGS" == *"--all"* ]] && ADD_ALL="1"
[[ "$ARGS" =~ --max[[:space:]]+([0-9]+) ]] && MAX="${BASH_REMATCH[1]}"

if [ -n "$ADD_ALL" ]; then
  git add *
fi

if [ -n "$NO_PREFIX" ]; then
  STYLE_RULES="- No conventional prefix (no fix:, feat:, chore:, etc.)
- Start with an uppercase verb (Add, Fix, Remove, Update, Replace, Move, Rename, etc.)"
else
  STYLE_RULES="- Use conventional commit prefix (fix:, feat:, chore:, refactor:, docs:, etc.)
- Lowercase after the prefix"
fi

DIFF=$(git diff --cached)
if [ -z "$DIFF" ]; then
  DIFF=$(git diff)
fi

if [ -z "$DIFF" ]; then
  echo "Nothing to commit — working tree is clean."
  exit 1
fi

LOG=$(git log --oneline -10)

RESULT=$(printf '%s' "Generate a single-line git commit message for the following diff.

Rules:
$STYLE_RULES
- One line only, under $MAX characters
- Focus on what changed and why, not which files were touched
- Match the tone and style of the recent commits shown below

Recent commits (for style reference):
$LOG

Diff:
$DIFF

Output the commit message only — no explanation, no quotes, no extra lines." | ~/.local/bin/call_local_llm.py)

if [ -n "$ONLY_MSG" ]; then
  echo ""
  echo "Suggested commit message:"
  echo ""
  echo "  $RESULT"
  echo ""
else
  git commit -m "$RESULT"
fi
```
