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
  *)
    echo "Usage: branch.sh [create|rename]"
    echo ""
    echo "  create <name>                 Create and switch to a new branch"
    echo "  rename <new-name>             Rename current branch"
    echo "  rename <old-name> <new-name>  Rename another branch"
    echo ""
    echo "To delete a branch, run manually: git branch -d <name> (or -D to force)"
    exit 1
    ;;
esac
