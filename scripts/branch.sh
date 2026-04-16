#!/bin/bash
set -euo pipefail

NAME="${1:-}"

if [ -z "$NAME" ]; then
  echo "Usage: branch.sh <name>"
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
