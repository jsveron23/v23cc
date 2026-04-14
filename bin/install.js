#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isLocal = args.includes('--local') || args.includes('-l');
const isUninstall = args.includes('--uninstall');

const COMMANDS_SRC = path.join(__dirname, '..', 'commands');

function promptChoice() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      'Install globally (~/.claude) or locally (./.claude)? [G/l] ',
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      }
    );
  });
}

async function getTargetDir() {
  if (isGlobal) return path.join(os.homedir(), '.claude', 'commands');
  if (isLocal) return path.join(process.cwd(), '.claude', 'commands');

  const answer = await promptChoice();
  if (answer === 'l' || answer === 'local') {
    return path.join(process.cwd(), '.claude', 'commands');
  }
  return path.join(os.homedir(), '.claude', 'commands');
}

function collectMdFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(rel);
    }
  }
  return results;
}

function install(targetDir) {
  const files = collectMdFiles(COMMANDS_SRC);

  for (const rel of files) {
    const src = path.join(COMMANDS_SRC, rel);
    const dest = path.join(targetDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${rel}`);
  }

  console.log(`\n✅ v23cc installed to ${targetDir}`);
  console.log('\nAvailable commands in Claude Code:');
  console.log('  /v23cc:youtube — Summarize a YouTube video');
  console.log('  /v23cc:model  — Manage local LLM presets');
  console.log('  /v23cc:commit    — Generate a git commit message');
  console.log('  /v23cc:sync-docs — Update README.md and CLAUDE.md\n');
}

function uninstall(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.log('Nothing to uninstall.');
    return;
  }

  const files = collectMdFiles(COMMANDS_SRC);

  for (const rel of files) {
    const dest = path.join(targetDir, rel);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log(`  ✗ removed ${rel}`);
    }
  }

  console.log(`\n✅ v23cc uninstalled from ${targetDir}\n`);
}

console.log(
  `\n🚀 v23cc — Claude Code workflow by Tony Jin<jsveron23@gmail.com>\n`
);

getTargetDir().then((targetDir) => {
  if (isUninstall) {
    uninstall(targetDir);
  } else {
    console.log(`Installing to: ${targetDir}\n`);
    install(targetDir);
  }
});
