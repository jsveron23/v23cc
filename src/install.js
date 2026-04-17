import fs from 'node:fs';
import { PIPELINE } from './commands/index.js';

export async function runInstall(ctx) {
  for (const cmd of PIPELINE) {
    await cmd.install(ctx);
  }
  ctx.log(`\n✅ v23cc installed to ${ctx.targetDir}`);
  ctx.log('\nAvailable commands in Claude Code:');
  const pad = Math.max(...ctx.installedCommands.map((c) => c.name.length));
  for (const { name, description } of ctx.installedCommands) {
    ctx.log(`  /${name.padEnd(pad)}  — ${description}`);
  }
  ctx.log('');
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
