#!/bin/bash
set -euo pipefail

ARGS="${*:-}"
BASE="develop"
ONLY_MSG=""

[[ "$ARGS" == *"--only-msg"* ]] && ONLY_MSG="1"
[[ "$ARGS" =~ --base[[:space:]]+([^[:space:]]+) ]] && BASE="${BASH_REMATCH[1]}"

LOG=$(git log --oneline "${BASE}..HEAD" 2>/dev/null || true)
DIFF=$(git diff "${BASE}...HEAD" 2>/dev/null || true)

if [ -z "$DIFF" ]; then
  echo "No changes found between current branch and '${BASE}'."
  exit 1
fi

RESULT=$(printf '%s' "Generate a pull request title and description for the following branch changes.

Rules:
- Line 1: PR title — imperative mood, under 72 characters, no period at end
- Line 2: blank
- Line 3+: Description in markdown with these sections:
  ## Summary
  - Bullet points describing what changed and why

Instructions:
- Focus on intent and impact, not which files were touched
- Match the tone of the recent commits shown below

Recent commits (for style reference):
$LOG

Diff:
$DIFF

Output the title and description only — no explanation, no code fences, no extra lines." | ~/.v23cc/call_local_llm.py)

if [ -z "$RESULT" ]; then
  echo "Error: LLM returned empty result — aborted." >&2
  exit 1
fi

TITLE=$(echo "$RESULT" | head -n 1)
BODY=$(echo "$RESULT" | tail -n +3)

if [ -n "$ONLY_MSG" ]; then
  echo ""
  echo "PR Title:"
  echo ""
  echo "  $TITLE"
  echo ""
  echo "PR Description:"
  echo ""
  echo "$BODY"
  echo ""
else
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if ! git config "branch.${BRANCH}.remote" > /dev/null 2>&1; then
    git push -u origin "$BRANCH"
  fi

  if gh pr create --base "$BASE" --title "$TITLE" --body "$BODY"; then
    echo ""
    echo "PR created."
  else
    echo ""
    echo "PR creation failed."
    exit 1
  fi
fi
