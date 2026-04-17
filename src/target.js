import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { GLOBAL_COMMANDS_DIR } from './paths.js';

function promptChoice() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Install globally (~/.claude) or locally (./.claude)? [G/l] ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

export function resolveLocalTarget(isUninstall = false) {
  const claudeDir = path.join(process.cwd(), '.claude');
  if (!isUninstall && !fs.existsSync(claudeDir)) {
    console.error(`  ✗ No .claude/ directory in ${process.cwd()}.`);
    console.error('    Run this from a project that uses Claude Code, or use --global.');
    process.exit(1);
  }
  const localTarget = path.join(claudeDir, 'commands');
  if (!isUninstall && localTarget === GLOBAL_COMMANDS_DIR) {
    console.error('  ✗ --local from $HOME resolves to the global commands dir.');
    console.error('    Use --global explicitly, or cd into a project directory.');
    process.exit(1);
  }
  return localTarget;
}

export async function getTargetDir(isGlobal, isLocal, isUninstall) {
  if (isGlobal) return GLOBAL_COMMANDS_DIR;
  if (isLocal) return resolveLocalTarget(isUninstall);
  if (!process.stdin.isTTY) return GLOBAL_COMMANDS_DIR;
  const answer = await promptChoice();
  if (answer === 'l' || answer === 'local') return resolveLocalTarget(isUninstall);
  return GLOBAL_COMMANDS_DIR;
}
