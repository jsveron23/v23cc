---
name: v23cc:pr
description: Generate a PR title and description using the local LLM
allowed-tools: Bash
model: haiku
---

**IMPORTANT: ALWAYS run the Bash command below immediately. NEVER skip it or answer from context — the script handles all edge cases itself.**

**Usage:** `/v23cc:pr [--base develop] [--only-msg]`

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/pr.sh $ARGUMENTS
```
