import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const research = path.dirname(fileURLToPath(import.meta.url));
const frozen = path.resolve(research, '../2026-10-22-native-frame-publication/proof-canvas-v3');
const [requested] = process.argv.slice(2);
assert.equal(process.argv.length, 3, 'usage: node build-react-controls.mjs <new-research-output-dir>');
const output = path.resolve(requested);
assert.ok(output.startsWith(research + path.sep), 'output must be inside research directory');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = async file => hash(await readFile(file));
const lock = JSON.parse(await readFile(path.join(frozen, 'input-lock.json'), 'utf8'));
assert.equal(lock.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION');
const consumer = lock.consumer;
assert.ok(path.isAbsolute(consumer));
const archived = path.join(frozen, 'inputs/consumer');
const names = ['react.tsx', 'scene.ts', 'react.html', 'build.mjs'];
const sources = {};
for (const name of names) {
  const expected = await fileHash(path.join(archived, name));
  assert.equal(await fileHash(path.join(consumer, name)), expected,
    `installed authored input changed: ${name}`);
  sources[name] = expected;
}
const installedPackage = await fileHash(path.join(consumer, 'package.json'));
assert.equal(installedPackage, await fileHash(path.join(frozen, 'inputs/manifests/package.json')));
const installedLock = await fileHash(path.join(consumer, 'pnpm-lock.yaml'));
assert.equal(installedLock, await fileHash(path.join(frozen, 'inputs/manifests/pnpm-lock.yaml')));
const requireFromConsumer = createRequire(path.join(consumer, 'build.mjs'));
const importPinned = async name => import(pathToFileURL(requireFromConsumer.resolve(name)).href);
const { build } = await importPinned('vite');
const react = (await importPinned('@vitejs/plugin-react')).default;
const vitePackageDir = path.join(consumer, 'node_modules/@r3act/vite');
const vitePackage = JSON.parse(await readFile(path.join(vitePackageDir, 'package.json'), 'utf8'));
assert.equal(vitePackage.name, '@r3act/vite');
assert.equal(vitePackage.type, 'module');
const viteExport = vitePackage.exports?.['.'];
const viteImport = viteExport?.import ?? viteExport?.default;
assert.ok(typeof viteImport === 'string' && viteImport.startsWith('./'),
  'Pinned @r3act/vite must declare a relative ESM import/default export');
const viteEntry = path.resolve(vitePackageDir, viteImport);
assert.ok(viteEntry.startsWith(vitePackageDir + path.sep),
  'Pinned @r3act/vite export must remain within its package');
const { nativeReactPlugins } = await import(pathToFileURL(viteEntry).href);
await mkdir(output);
const captures = [];
let armCode = '';
const capture = { name: 'react-compiler-off-source-capture', enforce: 'post', async transform(code, id) {
  const clean = id.split('?', 1)[0];
  if (!clean.startsWith(consumer + path.sep) || !/\.[jt]sx?$/.test(clean)) return null;
  const relative = path.relative(consumer, clean).replaceAll(path.sep, '/');
  if (relative === 'react.tsx') armCode = code;
  const target = path.join(output, 'transforms', relative + '.js');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, code, { flag: 'wx' });
  captures.push(relative);
  return null;
} };
const result = { schemaVersion: 1, status: 'STARTED', control: 'react-compiler-off',
  sourceConsumer: consumer, archivedSource: archived,
  originalBuildSha256: sources['build.mjs'], sourceSha256: sources,
  installedPackageSha256: installedPackage, installedLockSha256: installedLock,
  vitePackageSha256: await fileHash(path.join(vitePackageDir, 'package.json')),
  viteExport: viteImport,
  onlyConfigDelta: 'Remove babel-plugin-react-compiler from reactOptions.babel.plugins; preserve all other React/Vite/native plugin settings, authored source and pins.',
  config: { root: consumer, base: './', mode: 'react', minify: false,
    jsx: { runtime: 'automatic', importSource: 'react' },
    reactInclude: 'react(?:-frame)?\\.tsx$', jsxImportSource: 'react',
    sourceRoots: ['native.tsx'], compilerPlugin: false },
  captures: [], assets: [] };
try {
  await build({ configFile: false, root: consumer, base: './',
    plugins: nativeReactPlugins(react, { root: consumer, sourceRoots: ['native.tsx'],
      reactOptions: { include: /react(?:-frame)?\.tsx$/,
        jsxImportSource: 'react', babel: { plugins: [] } } }).concat(capture),
    oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
    build: { outDir: path.join(output, 'dist', 'react'), emptyOutDir: true,
      minify: false, rolldownOptions: { input: path.join(consumer, 'react.html') } } });
  assert.ok(captures.includes('react.tsx') && captures.includes('scene.ts'));
  assert.match(armCode, /function Position\(/);
  assert.match(armCode, /function Rotation\(/);
  assert.doesNotMatch(armCode, /\b_c\d*\(/,
    'React Compiler memoization unexpectedly present in compiler-OFF transform');
  assert.doesNotMatch(armCode, /react\/compiler-runtime/);
  const walk = async directory => {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) found.push(...await walk(file));
      else if (entry.isFile()) found.push(file);
      else throw new Error(`Unexpected output entry: ${file}`);
    }
    return found.sort();
  };
  result.captures = captures.sort();
  result.transform = { reactTsxSha256: hash(armCode),
    positionAndRotationPresent: true, compilerMemoCallsAbsent: true,
    compilerRuntimeImportAbsent: true };
  result.assets = await Promise.all((await walk(path.join(output, 'dist', 'react')))
    .map(async file => ({ relative: path.relative(output, file).replaceAll(path.sep, '/'),
      sha256: await fileHash(file), bytes: (await stat(file)).size })));
  result.status = 'COMPLETE_COMPILER_OFF_CONTROL';
} catch (error) {
  result.status = 'INCOMPLETE';
  result.error = error instanceof Error ? error.stack : String(error);
}
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
if (result.status !== 'COMPLETE_COMPILER_OFF_CONTROL') throw new Error(result.error);
