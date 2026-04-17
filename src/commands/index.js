import cleanupPrevNamespace from './cleanup-prev-namespace.js';
import copyCommandFiles from './copy-command-files.js';
import installScripts from './install-scripts.js';
import installMcp from './install-mcp.js';
import createOutputDir from './create-output-dir.js';
import migrateConfig from './migrate-config.js';
import updateScope from './update-scope.js';
import writeVersionMarker from './write-version-marker.js';
import registerHook from './register-hook.js';

export const PIPELINE = [
  cleanupPrevNamespace,
  copyCommandFiles,
  installScripts,
  installMcp,
  createOutputDir,
  migrateConfig,
  updateScope,
  writeVersionMarker,
  registerHook,
];
