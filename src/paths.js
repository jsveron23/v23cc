import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export const V23CC_HOME = path.join(os.homedir(), '.v23cc');
export const CONFIG_PATH = path.join(V23CC_HOME, 'config.json');
export const GLOBAL_COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');
export const COMMANDS_SRC = path.join(ROOT, 'commands');
export const SCRIPTS_SRC = path.join(ROOT, 'scripts');
export const MCP_SRC = path.join(ROOT, 'mcp');
export const V23CC_BIN = path.join(V23CC_HOME, 'bin');
export const V23CC_MCP = path.join(V23CC_HOME, 'mcp');
