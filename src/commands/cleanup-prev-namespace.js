import fs from 'node:fs';
import path from 'node:path';
import { unregisterMcp } from './install-mcp.js';

export default {
  name: 'cleanup-prev-namespace',
  async install(ctx) {
    if (!ctx.prevNamespace || ctx.prevNamespace === ctx.namespace) return;
    const oldDir = path.join(ctx.targetDir, ctx.prevNamespace);
    if (fs.existsSync(oldDir)) {
      fs.rmSync(oldDir, { recursive: true, force: true });
      ctx.log(`  ✗ removed old namespace directory: ${ctx.prevNamespace}/`);
    }
    unregisterMcp(ctx.prevNamespace, ctx);
  },
  async uninstall() {},
};
