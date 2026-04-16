#!/bin/bash
set -euo pipefail

ARGS="${*:-}"
BASE=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo "main")
ONLY_MSG=""

[[ "$ARGS" == *"--only-msg"* ]] && ONLY_MSG="1"

LOG=$(git log --oneline "${BASE}..HEAD" 2>/dev/null || true)
DIFF=$(git diff "${BASE}...HEAD" 2>/dev/null || true)

if [ -z "$DIFF" ]; then
  echo "No changes found between current branch and '${BASE}'."
  exit 1
fi

SYSTEM="You are a software engineer. Generate a pull request title and description for the following branch changes.

Rules:
- Line 1: PR title — imperative mood, under 72 characters, no period at end
- Line 2: blank
- Line 3+: Description in markdown with these sections:
  ## Summary
  - Bullet points describing what changed and why

Instructions:
- Focus on intent and impact, not which files were touched
- Match the tone of the recent commits shown below

Output the title and description only — no explanation, no code fences, no extra lines."

RESULT=$(printf '%s' "Recent commits (for style reference):
$LOG

Diff:
$DIFF" | SYSTEM="$SYSTEM" ~/.v23cc/call_local_llm.py)

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
  if git config "branch.${BRANCH}.remote" > /dev/null 2>&1; then
    # Case 1: Remote exists — push latest commits
    set +e
    git push
    PUSH_EXIT=$?
    set -e
    if [ $PUSH_EXIT -ne 0 ]; then
      # Case 2: Push failed (diverged/rejected) — guide user
      echo ""
      echo "Push failed — remote branch may have diverged."
      echo "To force push: git push --force-with-lease"
      exit 1
    fi
  else
    # Case 3: No remote — create tracking branch
    git push -u origin "$BRANCH"
  fi

  PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null || true)
  if [ -n "$PR_NUMBER" ]; then
    # PR exists — update it
    gh pr edit "$PR_NUMBER" --title "$TITLE" --body "$BODY"
    PR_URL=$(gh pr view --json url -q '.url')
    echo ""
    echo "PR #${PR_NUMBER} updated: $PR_URL"
  else
    # No PR — create one
    if gh pr create --base "$BASE" --title "$TITLE" --body "$BODY"; then
      echo ""
      echo "PR created."
    else
      echo ""
      echo "PR creation failed."
      exit 1
    fi
  fi
fi
