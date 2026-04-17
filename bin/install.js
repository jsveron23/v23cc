#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getTargetDir } from '../src/target.js';
import { createContext } from '../src/context.js';
import { runInstall, runUninstall } from '../src/install.js';

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isLocal = args.includes('--local') || args.includes('-l');
const isUninstall = args.includes('--uninstall');
const namespaceArgIdx = args.findIndex((a) => a === '--namespace' || a === '-n');
const namespaceArg = namespaceArgIdx !== -1 ? args[namespaceArgIdx + 1] : null;

if (namespaceArg !== null) {
  if (!namespaceArg || namespaceArg.startsWith('-') || !/^[a-zA-Z0-9_-]+$/.test(namespaceArg)) {
    console.error(`  ✗ Invalid namespace: "${namespaceArg}". Use only letters, numbers, hyphens, or underscores.`);
    process.exit(1);
  }
}

if (isUninstall && namespaceArg) {
  console.warn('  ⚠ --namespace is ignored during uninstall. The stored namespace will be used.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

console.log(`\n🚀 v23cc — Claude Code workflow by Tony Jin<jsveron23@gmail.com>\n`);

try {
  const targetDir = await getTargetDir(isGlobal, isLocal, isUninstall);

  if (isUninstall) {
    const ctx = createContext({ targetDir, pkgVersion: pkg.version });
    await runUninstall(ctx);
  } else {
    const namespace = namespaceArg ?? 'v23cc';
    console.log(`Installing to: ${targetDir} (namespace: ${namespace})\n`);
    const ctx = createContext({ targetDir, namespace, pkgVersion: pkg.version });
    await runInstall(ctx);
  }
} catch (err) {
  console.error(`\n  ✗ ${err.message}`);
  process.exit(1);
}
