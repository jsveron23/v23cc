import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_PATH, GLOBAL_COMMANDS_DIR } from './paths.js';

export function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function writeJsonAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

export function writeConfig(d) {
  writeJsonAtomic(CONFIG_PATH, d);
}

export function readScopes() {
  return readConfig().scopes || [];
}

export function writeScopes(scopes) {
  const d = readConfig();
  d.scopes = scopes;
  delete d.namespace;
  writeConfig(d);
}

export function getScopeKey(targetDir) {
  const normalized = path.resolve(targetDir);
  if (normalized === path.resolve(GLOBAL_COMMANDS_DIR)) return { type: 'global' };
  return { type: 'local', path: path.dirname(path.dirname(normalized)) };
}

export function scopeMatches(a, b) {
  if (a.type !== b.type) return false;
  if (a.type === 'local') return a.path === b.path;
  return true;
}

export function findScope(scopes, key) {
  return scopes.find((s) => scopeMatches(s, key)) || null;
}

export function upsertScope(scopes, key, namespace) {
  const existing = findScope(scopes, key);
  if (existing) {
    existing.namespace = namespace;
  } else {
    scopes.push({ ...key, namespace });
  }
}

export function removeScope(scopes, key) {
  const idx = scopes.findIndex((s) => scopeMatches(s, key));
  if (idx === -1) return null;
  const removed = scopes[idx];
  scopes.splice(idx, 1);
  return removed.namespace;
}
