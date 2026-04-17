import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { MCP_SRC, V23CC_MCP } from '../paths.js';
import { writeJsonAtomic } from '../config.js';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

export function unregisterMcp(namespace, ctx) {
  const serverName = `${namespace}-atlassian`;
  try {
    execSync(`claude mcp remove ${serverName} -s user`, { stdio: 'pipe' });
    ctx.log(`  ✗ removed ${serverName} MCP server`);
  } catch {}
}

function registerMcp(namespace, ctx) {
  const serverName = `${namespace}-atlassian`;
  const serverPath = path.join(V23CC_MCP, 'atlassian-server.js');
  try {
    execSync(`claude mcp add -s user ${serverName} node ${serverPath}`, { stdio: 'pipe' });
    ctx.log(`  ✓ registered ${serverName} MCP server (user scope)`);
  } catch {
    let settings = {};
    if (fs.existsSync(SETTINGS_PATH)) {
      try {
        settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      } catch {}
    }
    if (!settings.mcpServers) settings.mcpServers = {};
    settings.mcpServers[serverName] = { command: 'node', args: [serverPath] };
    writeJsonAtomic(SETTINGS_PATH, settings);
    ctx.log(`  ✓ registered ${serverName} MCP server in ~/.claude/settings.json`);
  }
}

function removeMcpFiles(ctx) {
  if (!fs.existsSync(V23CC_MCP)) return;
  const entries = fs.readdirSync(V23CC_MCP).filter((f) => f.endsWith('.js'));
  for (const file of entries) {
    const dest = path.join(V23CC_MCP, file);
    fs.unlinkSync(dest);
    ctx.log(`  ✗ removed ~/.v23cc/mcp/${file}`);
  }
}

export default {
  name: 'install-mcp',
  async install(ctx) {
    if (!fs.existsSync(MCP_SRC)) return;
    fs.mkdirSync(V23CC_MCP, { recursive: true });
    const entries = fs.readdirSync(MCP_SRC).filter((f) => f.endsWith('.js'));
    for (const file of entries) {
      const dest = path.join(V23CC_MCP, file);
      fs.copyFileSync(path.join(MCP_SRC, file), dest);
      fs.chmodSync(dest, 0o755);
      ctx.log(`  ✓ ~/.v23cc/mcp/${file}`);
    }
    const mcpPkg = { dependencies: { '@modelcontextprotocol/sdk': '^1' } };
    fs.writeFileSync(
      path.join(V23CC_MCP, 'package.json'),
      JSON.stringify(mcpPkg, null, 2) + '\n',
      'utf8'
    );
    ctx.log('  ✓ installing MCP server dependencies...');
    try {
      execSync('npm install --production --silent', { cwd: V23CC_MCP, stdio: 'inherit' });
      ctx.log('  ✓ MCP server dependencies installed');
    } catch {
      ctx.log(
        '  ⚠ npm install failed — MCP server may not work. Run "npm install" in ~/.v23cc/mcp/ manually.'
      );
    }
    registerMcp(ctx.namespace, ctx);
  },
  async uninstall(ctx) {
    unregisterMcp(ctx.namespace, ctx);
    if (ctx.isOnlyScope) removeMcpFiles(ctx);
  },
};
