import fs from 'node:fs';
import { CONFIG_PATH } from '../paths.js';
import { readConfig, writeConfig } from '../config.js';

export default {
  name: 'migrate-config',
  async install(ctx) {
    if (!fs.existsSync(CONFIG_PATH)) return;
    const d = readConfig();
    if (!('active' in d)) return;
    const activeName = d.active;
    delete d.active;
    for (const [name, cfg] of Object.entries(d.models || {})) {
      if (cfg && typeof cfg === 'object') cfg.active = name === activeName;
    }
    writeConfig(d);
    ctx.log('  ✓ migrated config.json to new format');
  },
  async uninstall() {},
};
