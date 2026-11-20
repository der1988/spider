import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'version-tamago-worker',
    apply: 'build',
    async writeBundle(options) {
      const dir = options.dir ?? 'dist';
      const files = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'touch.png'];
      const digest = createHash('sha256');
      for (const file of files) digest.update(await readFile(resolve(dir, file)));
      const worker = resolve(dir, 'sw.js');
      const source = await readFile(worker, 'utf8');
      digest.update(source);
      await writeFile(worker, 'const build = ' + JSON.stringify(digest.digest('hex')) + ';\n' + source);
    },
  }],
});
