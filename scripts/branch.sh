#!/bin/bash
set -euo pipefail

ACTION="${1:-}"
shift 2>/dev/null || true

case "$ACTION" in
  create)
    NAME="${1:-}"
    if [ -z "$NAME" ]; then
      echo "Usage: branch.sh create <name>"
      exit 1
    fi
    CURRENT=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT" = "$NAME" ]; then
      echo "Already on branch '$NAME'."
      exit 0
    fi
    git checkout -b "$NAME"
    echo ""
    echo "Switched to new branch '$NAME'."
    ;;
  switch)
    NAME="${1:-}"
    if [ -z "$NAME" ]; then
      echo "Usage: branch.sh switch <name>"
      exit 1
    fi
    CURRENT=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT" = "$NAME" ]; then
      echo "Already on branch '$NAME'."
      exit 0
    fi
    git checkout "$NAME"
    echo ""
    echo "Switched to branch '$NAME'."
    ;;
  rename)
    if [ $# -eq 1 ]; then
      git branch -m "$1"
      echo ""
      echo "Renamed current branch to '$1'."
    elif [ $# -eq 2 ]; then
      git branch -m "$1" "$2"
      echo ""
      echo "Renamed branch '$1' to '$2'."
    else
      echo "Usage: branch.sh rename [<old-name>] <new-name>"
      exit 1
    fi
    ;;
  track)
    REF="${1:-}"
    if [ -z "$REF" ]; then
      echo "Usage: branch.sh track <branch> or track <remote/branch>"
      exit 1
    fi
    if [[ "$REF" == */* ]]; then
      REMOTE="${REF%%/*}"
      BRANCH="${REF#*/}"
      git fetch "$REMOTE" "$BRANCH"
      git checkout -t "$REF"
    else
      REMOTES=$(git remote)
      REMOTE_COUNT=$(echo "$REMOTES" | grep -c . || true)
      if [ -z "$REMOTES" ]; then
        echo "No remote configured."
        exit 1
      elif [ "$REMOTE_COUNT" -eq 1 ]; then
        REMOTE="$REMOTES"
      else
        REMOTE="origin"
      fi
      git fetch "$REMOTE" "$REF"
      git checkout -t "${REMOTE}/${REF}"
    fi
    ;;
  list)
    FLAG="${1:-}"
    if [ "$FLAG" = "--all" ]; then
      git branch -a
    else
      git branch
    fi
    ;;
  current)
    git rev-parse --abbrev-ref HEAD
    ;;
  *)
    echo "Usage: branch.sh [create|switch|rename|track|list|current]"
    echo ""
    echo "  create <name>                 Create and switch to a new branch"
    echo "  switch <name>                 Switch to an existing branch"
    echo "  rename <new-name>             Rename current branch"
    echo "  rename <old-name> <new-name>  Rename another branch"
    echo "  track <branch>                Track and checkout a remote branch"
    echo "  track <remote/branch>         Track a branch from a specific remote"
    echo "  list [--all]                  List branches (--all includes remotes)"
    echo "  current                       Print current branch name"
    echo ""
    echo "To delete a branch, run manually: git branch -d <name> (or -D to force)"
    exit 1
    ;;
esac
