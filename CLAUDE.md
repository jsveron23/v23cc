# v23cc — AI Context

## Project Overview

**v23cc** is a collection of Claude Code slash commands that offload repetitive tasks to a locally running LLM, eliminating the need for cloud API calls and preserving token budget for core work.

- **Purpose**: Provide lightweight CLI commands for common coding tasks (commit messages, video summarization, documentation generation) via local LLM inference
- **Tech Stack**: Node.js/Bun, Claude Code markdown-based command system
- **Key Files**: `/commands/v23cc/*.md` (slash command definitions), `bin/install.js` (installer)

## Architecture

- **Command Format**: Markdown files in `/commands/v23cc/` define slash commands in Claude Code format
- **Installer**: `bin/install.js` copies commands to `~/.claude/commands/` (global) or `./.claude/commands/` (local)
- **Local LLM**: Commands pipe prompts to `~/.v23cc/call_local_llm.py` (OpenAI-compatible endpoint, mlx-lm recommended)
- **Config**: `~/.v23cc/config.json` stores active model preset and port configuration

## Commands

- **`/v23cc:model`** — Manage local LLM model presets (list, use, add, remove)
- **`/v23cc:youtube`** — Fetch and summarize YouTube video subtitles in any language
- **`/v23cc:commit`** — Generate git commit messages from staged changes
- **`/v23cc:sync-docs`** — Regenerate README.md and CLAUDE.md using local LLM context

## Codebase Notes

- Prettier configured: semi=true, singleQuote=true, tabWidth=2
- Node >=18.0.0 required
- License: MIT
- Repository: https://github.com/jsveron23/v23cc
