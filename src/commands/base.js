// Each command module must export a plain object matching this shape:
//
//   export default {
//     name: 'string',                   // for logging/debugging
//     install: async (ctx) => {},       // forward step
//     uninstall: async (ctx) => {},     // reverse step (may be a no-op)
//   };
//
// ctx fields: targetDir, namespace, scopeKey, scopes, prevNamespace,
//             isOnlyScope, pkgVersion, log(msg)
