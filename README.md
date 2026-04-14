# v23cc

A set of Claude Code slash commands that offload repetitive tasks to a local LLM — no cloud API calls, no tokens spent on boilerplate.

Instead of asking Claude to summarize a video or draft a commit message (burning context and API quota), v23cc pipes the work to a locally running model (e.g. Gemma via [mlx-lm](https://github.com/ml-explore/mlx-lm)). Claude stays focused on what it's good at; the local model handles the grunt work.

**What's included:**

- `/v23cc:model` — manage which local model preset is active
- `/v23cc:youtube` — fetch subtitles from a YouTube video and summarize them in any language
- `/v23cc:commit` — generate a git commit message from staged changes
- `/v23cc:sync-docs` — Update README.md and CLAUDE.md using local LLM

## Requirements

- **Node.js** >= 18
- **Python 3** — for the local LLM caller script (installed automatically to `~/.v23cc/`)
- **Local LLM server** — an OpenAI-compatible endpoint running locally (e.g. [mlx-lm](https://github.com/ml-explore/mlx-lm) on port 9000)
- **yt-dlp** — required for `/v23cc:youtube` (`pip install yt-dlp`)

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
| `/v23cc:youtube <URL> [--lang ko] [--percent 20]` | Summarize a YouTube video using local LLM |
| `/v23cc:commit [--max 72] [--no-prefix] [--only-msg] [--all]` | Generate and commit using local LLM |
| `/v23cc:sync-docs` | Update README.md and CLAUDE.md using local LLM |

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
```

## Uninstall

```bash
npx v23cc@latest --global --uninstall
npx v23cc@latest --local --uninstall
```

## Legal

This tool uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to download subtitles from YouTube. Users are responsible for complying with YouTube's Terms of Service and applicable copyright laws in their jurisdiction.

## License

MIT
