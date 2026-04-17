import fs from 'node:fs';
import path from 'node:path';

export default {
  name: 'create-output-dir',
  async install(ctx) {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
    const outDir = path.join(process.cwd(), 'v23cc');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
      ctx.log('  ✓ created v23cc/');
    }
    const entry = '/v23cc/';
    if (!content.split(/\r?\n/).some((line) => line.trim() === entry)) {
      content =
        content.endsWith('\n') || content === ''
          ? content + entry + '\n'
          : content + '\n' + entry + '\n';
      fs.writeFileSync(gitignorePath, content, 'utf8');
      ctx.log('  ✓ added /v23cc/ to .gitignore');
    }
  },
  async uninstall() {},
};
