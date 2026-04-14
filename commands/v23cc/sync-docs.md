---
name: v23cc:sync-docs
description: Update README.md and CLAUDE.md using the local LLM
allowed-tools: Bash
---

Update README.md and CLAUDE.md by gathering deep project context and regenerating both files using the local LLM.

**Usage:** `/v23cc:sync-docs [--lines 100] [--keep "section name"]`

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/sync-docs.sh $ARGUMENTS
```
