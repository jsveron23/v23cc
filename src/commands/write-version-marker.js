import fs from 'node:fs';
import path from 'node:path';
import { V23CC_HOME } from '../paths.js';

export default {
  name: 'write-version-marker',
  async install(ctx) {
    fs.mkdirSync(V23CC_HOME, { recursive: true });
    fs.writeFileSync(path.join(V23CC_HOME, 'version'), ctx.pkgVersion, 'utf8');
  },
  async uninstall(ctx) {
    if (!ctx.isOnlyScope) return;
    const versionDest = path.join(V23CC_HOME, 'version');
    if (fs.existsSync(versionDest)) {
      fs.unlinkSync(versionDest);
      ctx.log('  ✗ removed ~/.v23cc/version');
    }
  },
};
