import { upsertScope, removeScope, writeScopes } from '../config.js';

export default {
  name: 'update-scope',
  async install(ctx) {
    upsertScope(ctx.scopes, ctx.scopeKey, ctx.namespace);
    writeScopes(ctx.scopes);
  },
  async uninstall(ctx) {
    removeScope(ctx.scopes, ctx.scopeKey);
    writeScopes(ctx.scopes);
    if (!ctx.isLastScope) {
      ctx.log(`  ℹ ~/.v23cc/ kept (${ctx.scopes.length} other scope(s) still active)`);
    }
  },
};
