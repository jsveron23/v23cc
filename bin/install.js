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
  const pyFile = 'call_local_llm.py';
  const pySrc = path.join(SCRIPTS_SRC, pyFile);
  if (fs.existsSync(pySrc)) {
    const pyDest = path.join(os.homedir(), '.v23cc', pyFile);
    fs.copyFileSync(pySrc, pyDest);
    fs.chmodSync(pyDest, 0o755);
    console.log(`  ✓ ~/.v23cc/${pyFile}`);
  }
  const hookSrc = path.join(SCRIPTS_SRC, 'check-update.js');
  if (fs.existsSync(hookSrc)) {
    const hookDest = path.join(os.homedir(), '.v23cc', 'check-update.js');
    fs.copyFileSync(hookSrc, hookDest);
    console.log(`  ✓ ~/.v23cc/check-update.js`);
  }
}

function writeVersionMarker(version) {
  const dir = path.join(os.homedir(), '.v23cc');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'version'), version, 'utf8');
}

function registerHook() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.error(`  ⚠ ${settingsPath} contains invalid JSON — skipping hook registration.`);
      return;
    }
  }
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

  const hookCommand = `node "${path.join(os.homedir(), '.v23cc', 'check-update.js')}"`;
  const alreadyRegistered = settings.hooks.SessionStart.some((entry) =>
    entry.hooks?.some((h) => h.command?.includes('.v23cc/check-update.js'))
  );
  if (!alreadyRegistered) {
    settings.hooks.SessionStart.push({ hooks: [{ type: 'command', command: hookCommand }] });
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`  ✓ registered SessionStart hook in ~/.claude/settings.json`);
  }
}

function unregisterHook() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) return;
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    return;
  }
  if (!settings.hooks?.SessionStart) return;
  const before = settings.hooks.SessionStart.length;
  settings.hooks.SessionStart = settings.hooks.SessionStart.filter(
    (entry) => !entry.hooks?.some((h) => h.command?.includes('.v23cc/check-update.js'))
  );
  if (settings.hooks.SessionStart.length !== before) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`  ✗ removed SessionStart hook from ~/.claude/settings.json`);
  }
}

function uninstallScripts() {
  if (!fs.existsSync(V23CC_BIN)) return;
  const entries = fs.readdirSync(V23CC_BIN).filter((f) => f.endsWith('.sh'));
  for (const file of entries) {
    const dest = path.join(V23CC_BIN, file);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log(`  ✗ removed ~/.v23cc/bin/${file}`);
    }
  }
  const pyDest = path.join(os.homedir(), '.v23cc', 'call_local_llm.py');
  if (fs.existsSync(pyDest)) {
    fs.unlinkSync(pyDest);
    console.log('  ✗ removed ~/.v23cc/call_local_llm.py');
  }
}

function migrateConfig() {
  const configPath = path.join(os.homedir(), '.v23cc', 'config.json');
  if (!fs.existsSync(configPath)) return;
  let d;
  try {
    d = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return;
  }
  if (!('active' in d)) return;
  const activeName = d.active;
  delete d.active;
  for (const [name, cfg] of Object.entries(d.models || {})) {
    cfg.active = name === activeName;
  }
  fs.writeFileSync(configPath, JSON.stringify(d, null, 2) + '\n', 'utf8');
  console.log('  ✓ migrated config.json to new format');
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
  migrateConfig();

  const pkg = require(path.join(__dirname, '..', 'package.json'));
  writeVersionMarker(pkg.version);
  registerHook();

  console.log(`\n✅ v23cc installed to ${targetDir}`);
  console.log('\nAvailable commands in Claude Code:');
  console.log('  /v23cc:youtube — Summarize a YouTube video');
  console.log('  /v23cc:model  — Manage local LLM presets');
  console.log('  /v23cc:commit    — Generate a git commit message');
  console.log('  /v23cc:sync-docs — Update README.md and CLAUDE.md');
  console.log('  /v23cc:pr        — Generate a PR title and description');
  console.log('  /v23cc:config    — Show config list\n');
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
  unregisterHook();

  const hookDest = path.join(os.homedir(), '.v23cc', 'check-update.js');
  if (fs.existsSync(hookDest)) {
    fs.unlinkSync(hookDest);
    console.log('  ✗ removed ~/.v23cc/check-update.js');
  }
  const versionDest = path.join(os.homedir(), '.v23cc', 'version');
  if (fs.existsSync(versionDest)) {
    fs.unlinkSync(versionDest);
    console.log('  ✗ removed ~/.v23cc/version');
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
