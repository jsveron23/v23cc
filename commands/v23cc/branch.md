---
name: v23cc:branch
description: Create, rename, or track a git branch
allowed-tools: Bash
model: haiku
---

**IMPORTANT: ALWAYS run the Bash command below immediately. NEVER skip it or answer from context — the script handles all edge cases itself.**

**Usage:** `/v23cc:branch [create|rename|track] <name>`

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/branch.sh $ARGUMENTS
```

> **To delete a branch**, run it yourself in terminal — it's too destructive for an AI command:
> ```
> git branch -d <name>   # safe (merged only)
> git branch -D <name>   # force delete
> ```
