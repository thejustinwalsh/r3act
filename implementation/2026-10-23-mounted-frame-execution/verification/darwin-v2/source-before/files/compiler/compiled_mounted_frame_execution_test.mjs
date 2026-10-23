import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformWithOxc } from 'vite';
import { nativeModuleCompilerPlugin } from './vite_native_module.ts';
import { createNativeRoot } from '../src/native_runtime_api.ts';
import { MemoryVDOMHost } from '../src/vdom_snapshot_runtime.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'implementation/2026-10-23-mounted-frame-execution/companion');
const artifact = path.join(root, '.cache', `compiled-mounted-frame-${randomUUID()}`);
const binary = process.env.COMPILER_SPIKE_BINARY ??
  path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const runtime = pathToFileURL(path.join(root, 'src/native_runtime_api.ts')).href;
const host = pathToFileURL(path.join(root, 'src/three_host.ts')).href;
const sha = value => createHash('sha256').update(value).digest('hex');
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
const modules = [];
await mkdir(artifact, { recursive: true });
try {
  for (const name of ['hud', 'game']) {
    const authored = await readFile(path.join(sourceDir, `${name}.tsx`), 'utf8');
    const source = authored.replaceAll("'@r3act/core'", JSON.stringify(runtime))
      .replaceAll("'@r3act/host-three'", JSON.stringify(host))
      .replace("'./hud'", "'./hud.mjs'");
    const sourcePath = path.join(artifact, `${name}.tsx`);
    await writeFile(sourcePath, source, { flag: 'wx' });
    const transformed = await plugin.transform.call({ addWatchFile() {},
      error(message) { throw new Error(String(message)); } }, source, sourcePath);
    assert.ok(transformed?.code, `Missing actual compiler output: ${name}`);
    assert.match(transformed.code, /closedStoreHostProgram/);
    if (name === 'game') {
      assert.match(transformed.code, /closedStoreExecution/);
      assert.match(transformed.code, /batchKernel/);
    }
    assert.doesNotMatch(transformed.code, /\beval\s*\(|\bnew\s+Function\s*\(/);
    await writeFile(path.join(artifact, `${name}.transformed.tsx`), transformed.code, { flag: 'wx' });
    const emitted = await transformWithOxc(transformed.code, sourcePath,
      { lang: 'tsx', jsx: { runtime: 'classic', pragma: 'jsx', pragmaFrag: 'Fragment' } });
    const modulePath = path.join(artifact, `${name}.mjs`);
    await writeFile(modulePath, emitted.code, { flag: 'wx' });
    modules.push({ name, authoredSha256: sha(authored), sourceSha256: sha(source),
      transformedSha256: sha(transformed.code), emittedSha256: sha(emitted.code) });
  }
  const app = await import(pathToFileURL(path.join(artifact, 'game.mjs')).href);
  const memory = new MemoryVDOMHost(), container = memory.createContainer();
  const hud = createNativeRoot(memory, container,
    { rootId: `mounted-game-hud-${randomUUID()}`, scheduleCommit() {} });
  const result = app.runGameLifecycle(hud,
    () => Number(container.children[0]?.props['data-tick']));
  assert.equal(result.status, 'PASS');
  assert.equal(result.owners, 1024);
  assert.equal(result.resources, 2054);
  assert.equal(result.disposals, 2054);
  assert.equal(result.activations, result.retirements);
  assert.equal(result.oldSnapshotImmutable, true);
  assert.equal(result.sharedFrames, 12);
  assert.equal(result.coherentFrames, 1);
  await writeFile(path.join(artifact, 'result.json'), JSON.stringify({ status: 'PASS',
    modules, result, compilerSha256: sha(await readFile(binary)),
    scope: 'Actual Rust/OXC modules, Three host and memory HUD; browser companion supplies real DOM/WebGL.' }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: 'PASS_COMPILED_MOUNTED_FRAME_GAME', artifact, result }));
} finally { await plugin.closeBundle?.(); }
