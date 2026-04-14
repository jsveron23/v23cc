---
name: v23cc:model
description: Manage local LLM models (list, use, add, remove)
allowed-tools: Bash
model: haiku
---

Manage local LLM model presets stored in `~/.v23cc/config.json`.

**Usage:** `/v23cc:model [list | use <name> | add <name> <model-id> [port] | remove <name>]`

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/model.sh $ARGUMENTS
```
