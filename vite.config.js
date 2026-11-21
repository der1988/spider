import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const proxy = {'/api/scores':'http://127.0.0.1:8787','/api/endless':'http://127.0.0.1:8787'};

export default defineConfig({
  server: {proxy},
  preview: {proxy},
  base: './',
  plugins: [{
    name: 'version-tamago-worker',
    apply: 'build',
    async writeBundle(options) {
      const dir = options.dir ?? 'dist';
      const files = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'touch.png', 'the-fly-has-ai.mp3', 'the-fly-has-an-upgrade.mp3', 'the-room-has-a-space-bar.mp3', 'the-fly-is-you.mp3', 'infinite-loop.mp3', 'menusong.mp3'];
      const digest = createHash('sha256');
      for (const file of files) digest.update(await readFile(resolve(dir, file)));
      const worker = resolve(dir, 'sw.js');
      const source = await readFile(worker, 'utf8');
      digest.update(source);
      await writeFile(worker, 'const build = ' + JSON.stringify(digest.digest('hex')) + ';\n' + source);
    },
  }],
});
