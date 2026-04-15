#!/bin/bash
set -euo pipefail

ARGS="${*:-}"
MAX="72"
NO_PREFIX=""
ONLY_MSG=""
ADD_ALL=""

[[ "$ARGS" == *"--no-prefix"* ]] && NO_PREFIX="1"
[[ "$ARGS" == *"--only-msg"* ]] && ONLY_MSG="1"
[[ "$ARGS" == *"--all"* ]] && ADD_ALL="1"
[[ "$ARGS" =~ --max[[:space:]]+([0-9]+) ]] && MAX="${BASH_REMATCH[1]}"

if [ -n "$ADD_ALL" ]; then
  git add -A
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
  echo "Nothing to commit — working tree is clean."
  exit 1
fi

LOG=$(git log --oneline -10)

SYSTEM="You are a software engineer. Generate a single-line git commit message for the following diff.

Rules:
$STYLE_RULES
- One line only, under $MAX characters
- Focus on what changed and why, not which files were touched
- Match the tone and style of the recent commits shown below

Output the commit message only — no explanation, no quotes, no extra lines."

RESULT=$(printf '%s' "Recent commits (for style reference):
$LOG

Diff:
$DIFF" | SYSTEM="$SYSTEM" ~/.v23cc/call_local_llm.py)

if [ -z "$RESULT" ]; then
  echo "Error: LLM returned empty result — commit aborted." >&2
  exit 1
fi

if [ -n "$ONLY_MSG" ]; then
  echo ""
  echo "Suggested commit message:"
  echo ""
  echo "  $RESULT"
  echo ""
else
  if git commit -m "$RESULT"; then
    echo ""
    echo "Committed:"
    git log --oneline -1
  else
    echo ""
    echo "Commit failed."
    exit 1
  fi
fi
