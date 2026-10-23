import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const research = path.dirname(fileURLToPath(import.meta.url));
const frozen = path.resolve(research, '../2026-10-22-native-frame-publication/proof-canvas-v3');
const [requested] = process.argv.slice(2);
assert.equal(process.argv.length, 3, 'usage: node make-manual-variant.mjs <new-research-copy-dir>');
const output = path.resolve(requested);
assert.ok(output.startsWith(research + path.sep), 'copy must be inside research directory');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = async file => hash(await readFile(file));
const lock = JSON.parse(await readFile(path.join(frozen, 'input-lock.json'), 'utf8'));
assert.equal(lock.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION');
const installed = lock.consumer;
const archived = path.join(frozen, 'inputs/consumer');
const originalScene = await readFile(path.join(archived, 'scene.ts'), 'utf8');
assert.equal(hash(originalScene), await fileHash(path.join(installed, 'scene.ts')));
assert.equal(await fileHash(path.join(installed, 'react.tsx')),
  await fileHash(path.join(archived, 'react.tsx')));
const sceneAnchor = '  raf = requestAnimationFrame(tick);\n';
assert.equal(originalScene.split(sceneAnchor).length, 2,
  'shared harness must have exactly one initial automatic RAF');
const manualExposure = `  (window as Window & { realtimeManualHarness?: unknown }).realtimeManualHarness = {
    arm,
    inspect(epoch: number) {
      if (stopped || !Number.isSafeInteger(epoch) || epoch < 0)
        throw new Error('Invalid manual inspection epoch');
      const started = performance.now();
      const marker = arm.scene.getObjectByName('accepted-frame')?.position.x;
      if (marker !== epoch) throw new Error('Manual marker publication mismatch');
      const state = inspect(arm.scene, epoch, references, children as THREE.Object3D[]);
      return { ...state, marker, valuesChecked: OBJECTS * 3 + 1,
        validationMs: performance.now() - started };
    },
    draw() {
      if (stopped) throw new Error('Manual harness stopped');
      return draw(arm);
    },
    stop,
  };
`;
const manualScene = originalScene.replace(sceneAnchor, manualExposure);
assert.equal(manualScene.replace(manualExposure, sceneAnchor), originalScene,
  'manual scene may differ only at the first RAF request');
await mkdir(output);
const entries = await readdir(archived, { withFileTypes: true });
assert.equal(entries.length, 14, 'frozen consumer source inventory changed');
const copied = {};
for (const entry of entries) {
  assert.ok(entry.isFile(), `Unexpected consumer entry: ${entry.name}`);
  const source = path.join(archived, entry.name);
  const target = path.join(output, entry.name);
  await copyFile(source, target);
  copied[entry.name] = await fileHash(target);
  assert.equal(copied[entry.name], await fileHash(source));
}
await writeFile(path.join(output, 'scene.ts'), manualScene);
copied['scene.ts'] = hash(manualScene);
await copyFile(path.join(installed, 'package.json'), path.join(output, 'package.json'));
await copyFile(path.join(installed, 'pnpm-lock.yaml'), path.join(output, 'pnpm-lock.yaml'));
await copyFile(path.join(installed, 'pnpm-workspace.yaml'), path.join(output, 'pnpm-workspace.yaml'));
copied['package.json'] = await fileHash(path.join(output, 'package.json'));
copied['pnpm-lock.yaml'] = await fileHash(path.join(output, 'pnpm-lock.yaml'));
copied['pnpm-workspace.yaml'] = await fileHash(path.join(output, 'pnpm-workspace.yaml'));
await symlink(path.join(installed, 'node_modules'), path.join(output, 'node_modules'), 'dir');
const manifest = { schemaVersion: 1, status: 'PREPARED_COMPILER_ON_MANUAL_COPY',
  frozenProof: frozen, installedConsumer: installed, copy: output,
  config: 'Unchanged frozen build.mjs react baseline with compiler plugin enabled',
  onlySourceDelta: 'Replace the first automatic requestAnimationFrame(tick) in shared start with manual handle exposure; retain controlProof, original arm.update and original stop/disposal.',
  originalSceneSha256: hash(originalScene), manualSceneSha256: hash(manualScene),
  originalReactSha256: await fileHash(path.join(archived, 'react.tsx')),
  originalBuildSha256: await fileHash(path.join(archived, 'build.mjs')),
  copiedSha256: copied,
  api: { global: 'window.realtimeManualHarness', members: ['arm', 'inspect(epoch)', 'draw()', 'stop()'],
    valuesCheckedPerInspection: 769,
    disposal: 'Original shared stop waits for each of 512 resources to dispose exactly once' },
  nextCommand: `node ${path.join(output, 'build.mjs')} react <new-research-proof-dir>` };
await writeFile(path.join(output, 'manual-source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
