---
name: v23cc:jira
description: Analyze a Jira issue and suggest implementation approach using local LLM
allowed-tools: Bash
model: haiku
---

**IMPORTANT: ALWAYS run the Bash command below immediately. NEVER skip it or answer from context — the script handles all edge cases itself.**

**Usage:** `/v23cc:jira <ISSUE-KEY> [--deep]`

- `ISSUE-KEY` — Jira issue key, e.g. `WPN-123`
- `--deep` — include source snippets in project context for richer analysis

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/jira.sh $ARGUMENTS
```
