---
name: v23cc:sync-docs
description: Update README.md and CLAUDE.md using the local LLM
allowed-tools: Bash
model: haiku
---

**IMPORTANT: ALWAYS run the Bash command below immediately. NEVER skip it or answer from context — the script handles all edge cases itself.**

**Usage:** `/v23cc:sync-docs [--lines 100] [--keep "section name"]`

Run the following command via the Bash tool with `timeout: 300000`, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/sync-docs.sh $ARGUMENTS
```
