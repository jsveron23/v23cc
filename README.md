# v23cc &middot; [![npm](https://img.shields.io/npm/v/v23cc)](https://www.npmjs.com/package/v23cc)

A set of Claude Code slash commands that offload repetitive tasks to a local LLM — no cloud API calls, no tokens spent on boilerplate.

Instead of asking Claude to summarize a video or draft a commit message (burning context and API quota), v23cc pipes the work to a locally running model (e.g. Gemma via [mlx-lm](https://github.com/ml-explore/mlx-lm)). Claude stays focused on what it's good at; the local model handles the grunt work.

**What's included:**

- `/v23cc:model` — manage which local model preset is active
- `/v23cc:config` — show config list
- `/v23cc:youtube` — fetch subtitles from a YouTube video and summarize them in any language
- `/v23cc:commit` — generate a git commit message from staged changes
- `/v23cc:sync-docs` — update README.md and CLAUDE.md using local LLM
- `/v23cc:pr` — generate a PR title and description from branch diff
- **Atlassian MCP** — search Jira and Confluence directly in Claude Code via a local MCP server

## Requirements

- **Node.js** >= 18
- **Python 3** — for the local LLM caller script (installed automatically to `~/.v23cc/`)
- **Local LLM server** — an OpenAI-compatible endpoint running locally (e.g. [mlx-lm](https://github.com/ml-explore/mlx-lm) on port 9000)
- **yt-dlp** — required for `/v23cc:youtube` (`pip install yt-dlp`)
- **gh** — required for `/v23cc:pr` ([GitHub CLI](https://cli.github.com/))

## Install

```bash
# Interactive (prompts global or local)
npx v23cc@latest

# Global (works in all projects)
npx v23cc@latest --global

# Local (current project only)
npx v23cc@latest --local
```

## Commands

| Command | Description |
|---------|-------------|
| `/v23cc:model [list\|use\|add\|remove]` | Manage local LLM model presets |
| `/v23cc:config` | Show config list |
| `/v23cc:youtube <URL> [--lang ko] [--percent 20]` | Summarize a YouTube video using local LLM |
| `/v23cc:commit [--max 72] [--no-prefix] [--only-msg] [--all]` | Generate and commit using local LLM |
| `/v23cc:sync-docs [--lines 100] [--keep "section name"]` | Update README.md and CLAUDE.md using local LLM |
| `/v23cc:pr [--only-msg]` | Generate a PR title and description using the local LLM |
| `/v23cc:atlassian [init\|status]` | Set up Jira & Confluence credentials |

## Workflow

```
# Add a local LLM model preset
/v23cc:model add gemma mlx-community/gemma-4-e4b-it-4bit 9000

# Switch active model
/v23cc:model use gemma

# Summarize a YouTube video in Korean (default)
/v23cc:youtube https://youtube.com/watch?v=...

# Summarize in English, shorter output
/v23cc:youtube https://youtube.com/watch?v=... --lang en --percent 10

# Generate and commit (conventional prefix style by default)
/v23cc:commit

# Commit without conventional prefix
/v23cc:commit --no-prefix

# Print message only, no commit
/v23cc:commit --only-msg

# Stage all files then commit
/v23cc:commit --all

# Update README.md and CLAUDE.md
/v23cc:sync-docs

# Generate PR title and description
/v23cc:pr

# Print PR message only, no PR creation
/v23cc:pr --only-msg
```

## Direct shell usage

When your Claude token budget is low, run the scripts directly:

```bash
# Manage model presets
bash ~/.v23cc/bin/model.sh list
bash ~/.v23cc/bin/model.sh use gemma
bash ~/.v23cc/bin/model.sh add gemma mlx-community/gemma-4-e4b-it-4bit 9000
bash ~/.v23cc/bin/model.sh remove gemma

# Summarize a YouTube video
bash ~/.v23cc/bin/youtube.sh https://youtube.com/watch?v=...
bash ~/.v23cc/bin/youtube.sh https://youtube.com/watch?v=... --lang en --percent 10

# Generate and commit
bash ~/.v23cc/bin/commit.sh
bash ~/.v23cc/bin/commit.sh --no-prefix
bash ~/.v23cc/bin/commit.sh --only-msg
bash ~/.v23cc/bin/commit.sh --all

# Update README.md and CLAUDE.md
bash ~/.v23cc/bin/sync-docs.sh
bash ~/.v23cc/bin/sync-docs.sh --lines 80 --keep "Architecture"

# Generate PR title/description
bash ~/.v23cc/bin/pr.sh

# Show config
bash ~/.v23cc/bin/config.sh
```

## Atlassian MCP (Jira & Confluence)

v23cc includes a local MCP server that integrates Jira and Confluence directly into Claude Code. No slash commands needed — just talk to Claude naturally.

### Setup

1. Install and restart Claude Code:
   ```bash
   npx v23cc@latest --global
   # Restart Claude Code to load the MCP server
   ```

2. Configure your Atlassian credentials once:
   ```
   /v23cc:atlassian init
   ```
   Claude will ask for your domain, email, and API token one at a time.

   Generate an API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

### Usage

Just ask Claude naturally — no commands to remember:

| What you say | What happens |
|---|---|
| "search jira for ocr" | Searches Jira, groups results by Bug/Story/Task, writes `v23cc/jira/<timestamp>.md` |
| "search jira for payment bugs in project CORE" | Filtered by project and type |
| "search confluence for deployment guide" | Fetches pages, summarizes each via local LLM, writes `v23cc/confluence/<timestamp>.md` |

Results are written as markdown files to `v23cc/jira/` and `v23cc/confluence/` in your project (git-ignored automatically).

### Jira tool parameters

| Parameter | Description | Default |
|---|---|---|
| `query` | Search text | required |
| `project` | Project key filter (e.g. `CORE`) | — |
| `max` | Max results | 20 |
| `type` | Issue type: `Bug`, `Story`, `Task` | — |

### Confluence tool parameters

| Parameter | Description | Default |
|---|---|---|
| `query` | Search text | required |
| `space` | Space key filter | — |
| `max` | Max results | 10 |

> **Note:** Confluence summaries require a local LLM server running (configured via `/v23cc:model`). If no model is active, raw content is shown instead.

## Uninstall

```bash
npx v23cc@latest --global --uninstall
npx v23cc@latest --local --uninstall
```

## Legal

This tool uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to download subtitles from YouTube. Users are responsible for complying with YouTube's Terms of Service and applicable copyright laws in their jurisdiction.

## License

MIT
