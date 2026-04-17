import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export default {
  name: 'write-version-marker',
  async install(ctx) {
    const dir = path.join(os.homedir(), '.v23cc');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'version'), ctx.pkgVersion, 'utf8');
  },
  async uninstall(ctx) {
    if (!ctx.isLastScope) return;
    const versionDest = path.join(os.homedir(), '.v23cc', 'version');
    if (fs.existsSync(versionDest)) {
      fs.unlinkSync(versionDest);
      ctx.log('  ✗ removed ~/.v23cc/version');
    }
    const checkUpdateDest = path.join(os.homedir(), '.v23cc', 'check-update.js');
    if (fs.existsSync(checkUpdateDest)) {
      fs.unlinkSync(checkUpdateDest);
      ctx.log('  ✗ removed ~/.v23cc/check-update.js');
    }
  },
};
