import fs from 'node:fs';
import path from 'node:path';
import { COMMANDS_SRC } from '../paths.js';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function collectMdFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(rel);
    }
  }
  return results;
}

export default {
  name: 'copy-command-files',
  async install(ctx) {
    const files = collectMdFiles(COMMANDS_SRC);
    for (const rel of files) {
      const src = path.join(COMMANDS_SRC, rel);
      const destRel = rel.replace(/^v23cc\//, `${ctx.namespace}/`);
      const dest = path.join(ctx.targetDir, destRel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      let content = fs.readFileSync(src, 'utf8');
      if (ctx.namespace !== 'v23cc') {
        content = content.replace(/^name: v23cc:/m, `name: ${ctx.namespace}:`);
        content = content.replace(/\/v23cc:/g, `/${ctx.namespace}:`);
      }
      fs.writeFileSync(dest, content, 'utf8');
      ctx.log(`  ✓ ${destRel}`);
      const fm = parseFrontmatter(content);
      if (fm.name && fm.description) {
        ctx.installedCommands.push({ name: fm.name, description: fm.description });
      }
    }
  },
  async uninstall(ctx) {
    const files = collectMdFiles(COMMANDS_SRC);
    for (const rel of files) {
      const destRel = rel.replace(/^v23cc\//, `${ctx.namespace}/`);
      const dest = path.join(ctx.targetDir, destRel);
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        ctx.log(`  ✗ removed ${destRel}`);
      }
    }
  },
};
