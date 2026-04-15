---
name: v23cc:commit
description: Generate a commit message using the local LLM
allowed-tools: Bash
model: haiku
---

**IMPORTANT: ALWAYS run the Bash command below immediately. NEVER skip it or answer from context — the script handles all edge cases itself.**

Do not stage files manually — staging only happens via the `--all` flag.

**Usage:** `/v23cc:commit [--max 72] [--no-prefix] [--only-msg] [--all]`

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/commit.sh $ARGUMENTS
```
