---
name: v23cc:commit
description: Generate a commit message using the local LLM
allowed-tools: Bash
---

Generate a single-line git commit message from staged (or unstaged) changes using the local LLM, then commit.

**Usage:** `/v23cc:commit [--max 72] [--no-prefix] [--only-msg] [--all]`

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/commit.sh $ARGUMENTS
```
