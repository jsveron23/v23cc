#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isLocal = args.includes('--local') || args.includes('-l');
const isUninstall = args.includes('--uninstall');

const namespaceArgIdx = args.findIndex((a) => a === '--namespace' || a === '-n');
const namespaceArg = namespaceArgIdx !== -1 ? args[namespaceArgIdx + 1] : null;

function readStoredNamespace() {
  const configPath = path.join(os.homedir(), '.v23cc', 'config.json');
  if (!fs.existsSync(configPath)) return 'v23cc';
  try {
    const d = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return d.namespace || 'v23cc';
  } catch (e) {
    return 'v23cc';
  }
}

function saveNamespace(namespace) {
  const configPath = path.join(os.homedir(), '.v23cc', 'config.json');
  let d = {};
  if (fs.existsSync(configPath)) {
    try { d = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
  }
  d.namespace = namespace;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(d, null, 2) + '\n', 'utf8');
}

const COMMANDS_SRC = path.join(__dirname, '..', 'commands');
const SCRIPTS_SRC = path.join(__dirname, '..', 'scripts');
const MCP_SRC = path.join(__dirname, '..', 'mcp');
const V23CC_BIN = path.join(os.homedir(), '.v23cc', 'bin');
const V23CC_MCP = path.join(os.homedir(), '.v23cc', 'mcp');

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

function installMcp(namespace) {
  if (!fs.existsSync(MCP_SRC)) return;
  fs.mkdirSync(V23CC_MCP, { recursive: true });
  const entries = fs.readdirSync(MCP_SRC).filter((f) => f.endsWith('.js'));
  for (const file of entries) {
    const src = path.join(MCP_SRC, file);
    const dest = path.join(V23CC_MCP, file);
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o755);
    console.log(`  ✓ ~/.v23cc/mcp/${file}`);
  }
  // Write package.json and install deps so server is self-contained
  const mcpPkg = { dependencies: { '@modelcontextprotocol/sdk': '^1' } };
  fs.writeFileSync(path.join(V23CC_MCP, 'package.json'), JSON.stringify(mcpPkg, null, 2) + '\n', 'utf8');
  console.log('  ✓ installing MCP server dependencies...');
  require('child_process').execSync('npm install --production --silent', { cwd: V23CC_MCP, stdio: 'inherit' });
  console.log('  ✓ MCP server dependencies installed');
  registerMcp(namespace);
}

function registerMcp(namespace) {
  const serverName = `${namespace}-atlassian`;
  const serverPath = path.join(os.homedir(), '.v23cc', 'mcp', 'atlassian-server.js');
  const { execSync } = require('child_process');
  try {
    execSync(`claude mcp add -s user ${serverName} node ${serverPath}`, { stdio: 'pipe' });
    console.log(`  ✓ registered ${serverName} MCP server (user scope)`);
  } catch (e) {
    // Fallback: write directly to settings.json
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
    }
    if (!settings.mcpServers) settings.mcpServers = {};
    settings.mcpServers[serverName] = { command: 'node', args: [serverPath] };
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`  ✓ registered ${serverName} MCP server in ~/.claude/settings.json`);
  }
}

function uninstallMcp(namespace) {
  // Remove files
  if (fs.existsSync(V23CC_MCP)) {
    const entries = fs.readdirSync(V23CC_MCP).filter((f) => f.endsWith('.js'));
    for (const file of entries) {
      const dest = path.join(V23CC_MCP, file);
      fs.unlinkSync(dest);
      console.log(`  ✗ removed ~/.v23cc/mcp/${file}`);
    }
  }
  // Remove via claude CLI
  const serverName = `${namespace}-atlassian`;
  const { execSync } = require('child_process');
  try {
    execSync(`claude mcp remove ${serverName} -s user`, { stdio: 'pipe' });
    console.log(`  ✗ removed ${serverName} MCP server`);
  } catch {}
}

function createOutputDir(namespace) {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const outDir = path.join(process.cwd(), namespace);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`  ✓ created ${namespace}/`);
  }
  const entry = `/${namespace}/`;
  if (!content.split('\n').some((line) => line.trim() === entry)) {
    content = content.endsWith('\n') || content === '' ? content + entry + '\n' : content + '\n' + entry + '\n';
    fs.writeFileSync(gitignorePath, content, 'utf8');
    console.log(`  ✓ added /${namespace}/ to .gitignore`);
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

function install(targetDir, namespace) {
  // Clean up old namespace if it changed
  const prevNamespace = readStoredNamespace();
  if (prevNamespace !== namespace) {
    const oldDir = path.join(targetDir, prevNamespace);
    if (fs.existsSync(oldDir)) {
      fs.rmSync(oldDir, { recursive: true, force: true });
      console.log(`  ✗ removed old namespace directory: ${prevNamespace}/`);
    }
    uninstallMcp(prevNamespace);
  }

  const files = collectMdFiles(COMMANDS_SRC);

  for (const rel of files) {
    const src = path.join(COMMANDS_SRC, rel);
    // Rewrite the source namespace directory to the chosen namespace
    const destRel = rel.replace(/^v23cc\//, `${namespace}/`);
    const dest = path.join(targetDir, destRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    let content = fs.readFileSync(src, 'utf8');
    if (namespace !== 'v23cc') {
      content = content.replace(/^name: v23cc:/m, `name: ${namespace}:`);
      content = content.replace(/\/v23cc:/g, `/${namespace}:`);
    }
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`  ✓ ${destRel}`);
  }

  installScripts();
  installMcp(namespace);
  createOutputDir(namespace);
  migrateConfig();
  saveNamespace(namespace);

  const pkg = require(path.join(__dirname, '..', 'package.json'));
  writeVersionMarker(pkg.version);
  registerHook();

  console.log(`\n✅ v23cc installed to ${targetDir}`);
  console.log('\nAvailable commands in Claude Code:');
  console.log(`  /${namespace}:youtube    — Summarize a YouTube video`);
  console.log(`  /${namespace}:model      — Manage local LLM presets`);
  console.log(`  /${namespace}:commit     — Generate a git commit message`);
  console.log(`  /${namespace}:sync-docs  — Update README.md and CLAUDE.md`);
  console.log(`  /${namespace}:pr         — Generate a PR title and description`);
  console.log(`  /${namespace}:config     — Show config list`);
  console.log(`  /${namespace}:atlassian  — Set up Jira & Confluence credentials`);
  console.log(`  /${namespace}:jira       — Analyze a Jira issue for implementation\n`);
}

function uninstall(targetDir) {
  const namespace = readStoredNamespace();

  if (!fs.existsSync(targetDir)) {
    console.log('Nothing to uninstall.');
    return;
  }

  const files = collectMdFiles(COMMANDS_SRC);

  for (const rel of files) {
    const destRel = rel.replace(/^v23cc\//, `${namespace}/`);
    const dest = path.join(targetDir, destRel);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log(`  ✗ removed ${destRel}`);
    }
  }

  uninstallScripts();
  uninstallMcp(namespace);
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
    const namespace = namespaceArg || 'v23cc';
    console.log(`Installing to: ${targetDir} (namespace: ${namespace})\n`);
    install(targetDir, namespace);
  }
});
