import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { nativeReactPlugins } from '@r3act/vite';
const here = path.dirname(fileURLToPath(import.meta.url)), out = process.argv[2];
assert.ok(path.isAbsolute(out));
const transformed = [];
const capture = { name: 'mounted-game-source-capture', enforce: 'post',
  async transform(code, id) {
    if (!['game.tsx', 'hud.tsx'].some(name => id === path.join(here, name))) return;
    assert.match(code, /closedStoreHostProgram/);
    if (id.endsWith('/game.tsx')) assert.match(code, /closedStoreExecution/);
    const target = path.join(out, 'transforms', path.basename(id) + '.js');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, code, { flag: 'wx' });
    transformed.push({ path: target, sha256: createHash('sha256').update(code).digest('hex') });
  },
};
await build({ configFile: false, mode: 'production', root: here, base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [...nativeReactPlugins(react, { root: path.dirname(here),
    sourceRoots: ['companion/game.tsx', 'companion/hud.tsx'] }), capture],
  build: { outDir: path.join(out, 'dist'), emptyOutDir: false, minify: true,
    rolldownOptions: { input: path.join(here, 'index.html') } } });
assert.equal(transformed.length, 2);
await writeFile(path.join(out, 'capture.json'), JSON.stringify({ status: 'PASS', transformed }, null, 2) + '\n', { flag: 'wx' });
