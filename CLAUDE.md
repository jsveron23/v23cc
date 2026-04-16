# v23cc — AI Context

## Project Overview

v23cc is a lightweight Claude Code workflow system that uses local LLM inference to offload repetitive coding tasks, preserving cloud token budget.

- **Purpose**: Provides CLI commands for tasks like commit message generation, video summarization, and documentation updates via local LLM.
- **Tech Stack**: Node.js/Bun, Claude Code markdown-based command system.
- **Key Files**: `/commands/v23cc/*.md` (slash command definitions), `bin/install.js` (installer).

## Architecture

- **Command Definition**: Slash commands are defined in Markdown files within `/commands/v23cc/`.
- **Execution Flow**: Commands pipe prompts to a local LLM endpoint (e.g., `mlx-lm`) for execution.
- **Configuration**: `~/.v23cc/config.json` manages the active local model preset and port settings.
- **Installation**: `bin/install.js` manages installation paths (global/local).

## Commands

- **`/v23cc:model`**: Manage local LLM model presets (list, use, add, remove).
- **`/v23cc:config`**: Show config list.
- **`/v23cc:youtube`**: Summarize a YouTube video using local LLM.
- **`/v23cc:commit`**: Generate a commit message using the local LLM.
- **`/v23cc:sync-docs`**: Update `README.md` and `CLAUDE.md` using the local LLM.
- **`/v23cc:pr`**: Generate a Pull Request title and description using the local LLM.

## Rules

- Do not claim files are outdated or out of sync without verifying first.
- When testing or applying scripts, install locally only (`node bin/install.js --local`). Never install globally unless explicitly asked.

## Codebase Notes

- See README.md for installation and usage instructions.
- Node >=18.0.0 required.
- License: MIT.
