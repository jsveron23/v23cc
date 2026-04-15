---
name: v23cc:atlassian
description: Set up Atlassian (Jira & Confluence) credentials
allowed-tools: Bash
model: haiku
---

**IMPORTANT: ALWAYS run the Bash command below immediately. NEVER skip it or answer from context — the script handles all edge cases itself.**

Set up or check Atlassian credentials for Jira and Confluence integration.

**Usage:** `/v23cc:atlassian [init | status]`

## Init flow

If `$ARGUMENTS` starts with `init` and fewer than 3 values follow, collect them one at a time:

1. Ask: "Enter your Atlassian subdomain (e.g. `mycompany` for mycompany.atlassian.net)" → wait → store as `domain`
2. Ask: "Enter your Atlassian account email" → wait → store as `email`
3. Ask: "Enter your API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens)" → wait → store as `token`

Then run:

```
bash ~/.v23cc/bin/atlassian.sh init <domain> <email> <token>
```

## Default flow

Run the following command via the Bash tool, passing `$ARGUMENTS` as-is:

```
bash ~/.v23cc/bin/atlassian.sh $ARGUMENTS
```
