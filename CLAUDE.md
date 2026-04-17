# v23cc — AI Context

## Project Overview

v23cc is a lightweight Claude Code workflow system that uses local LLM inference to offload repetitive coding tasks, preserving cloud token budget.

- **Purpose**: Provides CLI commands for tasks like commit message generation, video summarization, and documentation updates via local LLM.
- **Tech Stack**: Node.js/Bun, Claude Code markdown-based command system.
- **Key Files**: `/commands/v23cc/*.md` (slash command definitions), `bin/install.js` (CLI entrypoint), `src/commands/index.js` (PIPELINE array), `src/install.js` (orchestrator).

## Architecture

- **Command Definition**: Slash commands are defined in Markdown files within `/commands/v23cc/`.
- **Execution Flow**: Commands pipe prompts to a local LLM endpoint (e.g., `mlx-lm`) for execution.
- **Configuration**: `~/.v23cc/config.json` stores the active local model preset, port settings, and a `scopes` array tracking all active installs (`{type:'global'}` or `{type:'local', path:'...'}`).
- **Installation**: `bin/install.js` is a thin CLI shell (~30 lines) that parses args and dispatches to `src/install.js`. Install and uninstall run a `PIPELINE` array of command modules defined in `src/commands/index.js` — forward for install, reversed for uninstall. Each module exports `{ name, install(ctx), uninstall(ctx) }`. Adding a new install step = one new file + one line in the pipeline. Shared context (targetDir, namespace, scopes, isLastScope) is passed via a plain object from `src/context.js`. The codebase uses ESM (`"type": "module"`). `--namespace <name>` renames the command prefix (e.g., `/wp:commit`); the internal tool home (`~/.v23cc/`) stays fixed. Multiple scopes can coexist; shared files are only removed when the last scope is uninstalled. `--local` errors out if no `.claude/` directory is present, or if run from `$HOME`.

## Commands

See [README.md](README.md#commands) for the full command reference.

## Rules

- Do not claim files are outdated or out of sync without verifying first.
- When testing or applying scripts, install locally only (`node bin/install.js --local`). Never install globally unless explicitly asked.
- Never commit unless explicitly asked. Do not run commit scripts or `git commit` on your own.

## Codebase Notes

- See README.md for installation and usage instructions.
- Node >=18.0.0 required.
- License: MIT.
