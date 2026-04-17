import { readScopes, getScopeKey, findScope, scopeMatches } from './config.js';

export function createContext({ targetDir, namespace = null, pkgVersion }) {
  const scopes = readScopes();
  const scopeKey = getScopeKey(targetDir);
  const existing = findScope(scopes, scopeKey);
  const resolvedNamespace = namespace ?? existing?.namespace ?? 'v23cc';
  const prevNamespace = existing?.namespace ?? null;
  const isOnlyScope = scopes.filter((s) => !scopeMatches(s, scopeKey)).length === 0;
  return {
    targetDir,
    namespace: resolvedNamespace,
    scopeKey,
    scopes,
    prevNamespace,
    isOnlyScope,
    pkgVersion,
    installedCommands: [],
    log: (msg) => console.log(msg),
  };
}
