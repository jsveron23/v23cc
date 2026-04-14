#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isLocal = args.includes('--local') || args.includes('-l');
const isUninstall = args.includes('--uninstall');

const COMMANDS_SRC = path.join(__dirname, '..', 'commands');
const SCRIPTS_SRC = path.join(__dirname, '..', 'scripts');
const V23CC_BIN = path.join(os.homedir(), '.v23cc', 'bin');

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

function installScripts() {
  if (!fs.existsSync(SCRIPTS_SRC)) return;
  fs.mkdirSync(V23CC_BIN, { recursive: true });
  const entries = fs.readdirSync(SCRIPTS_SRC).filter((f) => f.endsWith('.sh'));
  for (const file of entries) {
    const src = path.join(SCRIPTS_SRC, file);
    const dest = path.join(V23CC_BIN, file);
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o755);
    console.log(`  ✓ ~/.v23cc/bin/${file}`);
  }
}

function uninstallScripts() {
  if (!fs.existsSync(V23CC_BIN)) return;
  const entries = fs.readdirSync(SCRIPTS_SRC).filter((f) => f.endsWith('.sh'));
  for (const file of entries) {
    const dest = path.join(V23CC_BIN, file);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log(`  ✗ removed ~/.v23cc/bin/${file}`);
    }
  }
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

  installScripts();

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

  uninstallScripts();

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
