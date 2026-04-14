#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isLocal = args.includes('--local') || args.includes('-l');
const isUninstall = args.includes('--uninstall');

const COMMANDS_SRC = path.join(__dirname, '..', 'commands');

function getTargetDir() {
  if (isGlobal) return path.join(os.homedir(), '.claude', 'commands');
  if (isLocal) return path.join(process.cwd(), '.claude', 'commands');

  // interactive fallback: default to global
  return path.join(os.homedir(), '.claude', 'commands');
}

function install(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  const files = fs.readdirSync(COMMANDS_SRC).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const src = path.join(COMMANDS_SRC, file);
    const dest = path.join(targetDir, file);
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${file}`);
  }

  console.log(`\n✅ v23cc installed to ${targetDir}`);
  console.log('\nAvailable commands in Claude Code:');
  console.log('  /plan     — Break down a task into atomic plans');
  console.log('  /execute  — Execute plans with fresh subagent contexts');
  console.log('  /review   — Code style & quality review');
  console.log('  /status   — Show current project state\n');
}

function uninstall(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.log('Nothing to uninstall.');
    return;
  }

  const files = fs.readdirSync(COMMANDS_SRC).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const dest = path.join(targetDir, file);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log(`  ✗ removed ${file}`);
    }
  }

  console.log(`\n✅ v23cc uninstalled from ${targetDir}\n`);
}

const targetDir = getTargetDir();

console.log(`\n🚀 v23cc — Claude Code workflow by jsveron23\n`);

if (isUninstall) {
  uninstall(targetDir);
} else {
  console.log(`Installing to: ${targetDir}\n`);
  install(targetDir);
}
