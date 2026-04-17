import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

export default {
  name: 'register-hook',
  async install(ctx) {
    const settings = readSettings();
    if (settings === null) {
      ctx.log(`  ⚠ ${SETTINGS_PATH} contains invalid JSON — skipping hook registration.`);
      return;
    }
    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
    const hookCommand = `node "${path.join(os.homedir(), '.v23cc', 'check-update.js')}"`;
    const alreadyRegistered = settings.hooks.SessionStart.some((entry) =>
      entry.hooks?.some((h) => h.command?.includes('.v23cc/check-update.js'))
    );
    if (!alreadyRegistered) {
      settings.hooks.SessionStart.push({ hooks: [{ type: 'command', command: hookCommand }] });
      writeSettings(settings);
      ctx.log(`  ✓ registered SessionStart hook in ~/.claude/settings.json`);
    }
  },
  async uninstall(ctx) {
    if (!ctx.isLastScope) return;
    if (!fs.existsSync(SETTINGS_PATH)) return;
    let settings = {};
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    } catch {
      return;
    }
    if (!settings.hooks?.SessionStart) return;
    const before = settings.hooks.SessionStart.length;
    settings.hooks.SessionStart = settings.hooks.SessionStart.filter(
      (entry) => !entry.hooks?.some((h) => h.command?.includes('.v23cc/check-update.js'))
    );
    if (settings.hooks.SessionStart.length !== before) {
      writeSettings(settings);
      ctx.log(`  ✗ removed SessionStart hook from ~/.claude/settings.json`);
    }
  },
};
