#!/usr/bin/env node
// Check for v23cc updates in background, notify via stderr if update available
// Called by SessionStart hook - runs once per session

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const homeDir = os.homedir();
const versionFile = path.join(homeDir, '.v23cc', 'version');
const cacheDir = path.join(homeDir, '.cache', 'v23cc');
const cacheFile = path.join(cacheDir, 'update-check.json');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const child = spawn(
  process.execPath,
  [
    '-e',
    `
  const fs = require('fs');
  const { execSync } = require('child_process');

  function isNewer(a, b) {
    const pa = (a || '').split('.').map((s) => Number(s.replace(/-.*/, '')) || 0);
    const pb = (b || '').split('.').map((s) => Number(s.replace(/-.*/, '')) || 0);
    for (let i = 0; i < 3; i++) {
      if (pa[i] > pb[i]) return true;
      if (pa[i] < pb[i]) return false;
    }
    return false;
  }

  const versionFile = ${JSON.stringify(versionFile)};
  const cacheFile = ${JSON.stringify(cacheFile)};

  let installed = '0.0.0';
  try {
    if (fs.existsSync(versionFile)) {
      installed = fs.readFileSync(versionFile, 'utf8').trim();
    }
  } catch (e) {}

  let latest = null;
  try {
    latest = execSync('npm view v23cc version', {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    }).trim();
  } catch (e) {}

  const result = {
    update_available: latest ? isNewer(latest, installed) : false,
    installed,
    latest: latest || 'unknown',
    checked: Math.floor(Date.now() / 1000),
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result));

  if (result.update_available) {
    process.stderr.write(
      '\\n⬆ v23cc update available: v' + installed + ' → v' + latest + '\\n' +
      '  Run: npx v23cc@latest\\n\\n'
    );
  }
`,
  ],
  {
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true,
    detached: true,
  }
);

child.unref();
