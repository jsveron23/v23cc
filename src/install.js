import fs from 'node:fs';
import { PIPELINE } from './commands/index.js';

export async function runInstall(ctx) {
  for (const cmd of PIPELINE) {
    await cmd.install(ctx);
  }
  ctx.log(`\n✅ v23cc installed to ${ctx.targetDir}`);
  ctx.log('\nAvailable commands in Claude Code:');
  ctx.log(`  /${ctx.namespace}:youtube    — Summarize a YouTube video`);
  ctx.log(`  /${ctx.namespace}:model      — Manage local LLM presets`);
  ctx.log(`  /${ctx.namespace}:commit     — Generate a git commit message`);
  ctx.log(`  /${ctx.namespace}:sync-docs  — Update README.md and CLAUDE.md`);
  ctx.log(`  /${ctx.namespace}:pr         — Generate a PR title and description`);
  ctx.log(`  /${ctx.namespace}:config     — Show config list`);
  ctx.log(`  /${ctx.namespace}:atlassian  — Set up Jira & Confluence credentials`);
  ctx.log(`  /${ctx.namespace}:jira       — Analyze a Jira issue for implementation\n`);
}

export async function runUninstall(ctx) {
  if (!fs.existsSync(ctx.targetDir)) {
    console.log('Nothing to uninstall.');
    return;
  }
  for (const cmd of [...PIPELINE].reverse()) {
    await cmd.uninstall(ctx);
  }
  ctx.log(`\n✅ v23cc uninstalled from ${ctx.targetDir}\n`);
}
