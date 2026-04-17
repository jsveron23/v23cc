import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SCRIPTS_SRC, V23CC_BIN } from '../paths.js';

export default {
  name: 'install-scripts',
  async install(ctx) {
    if (!fs.existsSync(SCRIPTS_SRC)) return;
    fs.mkdirSync(V23CC_BIN, { recursive: true });
    const entries = fs.readdirSync(SCRIPTS_SRC).filter((f) => f.endsWith('.sh'));
    for (const file of entries) {
      const dest = path.join(V23CC_BIN, file);
      fs.copyFileSync(path.join(SCRIPTS_SRC, file), dest);
      fs.chmodSync(dest, 0o755);
      ctx.log(`  ✓ ~/.v23cc/bin/${file}`);
    }
    const pyFile = 'call_local_llm.py';
    const pySrc = path.join(SCRIPTS_SRC, pyFile);
    if (fs.existsSync(pySrc)) {
      const pyDest = path.join(os.homedir(), '.v23cc', pyFile);
      fs.copyFileSync(pySrc, pyDest);
      fs.chmodSync(pyDest, 0o755);
      ctx.log(`  ✓ ~/.v23cc/${pyFile}`);
    }
    const hookSrc = path.join(SCRIPTS_SRC, 'check-update.js');
    if (fs.existsSync(hookSrc)) {
      const hookDest = path.join(os.homedir(), '.v23cc', 'check-update.js');
      fs.copyFileSync(hookSrc, hookDest);
      ctx.log(`  ✓ ~/.v23cc/check-update.js`);
    }
  },
  async uninstall(ctx) {
    if (!ctx.isLastScope) return;
    if (!fs.existsSync(V23CC_BIN)) return;
    const entries = fs.readdirSync(V23CC_BIN).filter((f) => f.endsWith('.sh'));
    for (const file of entries) {
      const dest = path.join(V23CC_BIN, file);
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        ctx.log(`  ✗ removed ~/.v23cc/bin/${file}`);
      }
    }
    const pyDest = path.join(os.homedir(), '.v23cc', 'call_local_llm.py');
    if (fs.existsSync(pyDest)) {
      fs.unlinkSync(pyDest);
      ctx.log('  ✗ removed ~/.v23cc/call_local_llm.py');
    }
  },
};
