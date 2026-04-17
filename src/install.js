import fs from 'node:fs';
import { PIPELINE } from './commands/index.js';
import { findScope } from './config.js';

export async function runInstall(ctx) {
  const completed = [];
  try {
    for (const cmd of PIPELINE) {
      await cmd.install(ctx);
      completed.push(cmd);
    }
  } catch (err) {
    ctx.log(`\n  ✗ Install failed: ${err.message}`);
    if (completed.length > 0) {
      ctx.log('  Rolling back...');
      for (const cmd of [...completed].reverse()) {
        try {
          await cmd.uninstall(ctx);
        } catch {}
      }
    }
    throw err;
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
  const matchedScope = findScope(ctx.scopes, ctx.scopeKey);
  if (!matchedScope) {
    if (ctx.scopes.length === 0) {
      console.log('Nothing to uninstall (no registered scopes).');
    } else {
      console.error('  ✗ No v23cc install found at this location.');
      console.error('  Known installs:');
      for (const s of ctx.scopes) {
        const location = s.type === 'global' ? 'global (~/.claude)' : `local: ${s.path}`;
        console.error(`    ${location}  [namespace: ${s.namespace}]`);
      }
      process.exit(1);
    }
    return;
  }
  if (!fs.existsSync(ctx.targetDir)) {
    ctx.log('  ⚠ Target directory not found — cleaning up scope registration only.');
  }
  for (const cmd of [...PIPELINE].reverse()) {
    await cmd.uninstall(ctx);
  }
  ctx.log(`\n✅ v23cc uninstalled from ${ctx.targetDir}\n`);
}
