import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const proof = path.join(root, 'implementation/2026-10-19-installed-scene/verification/package-supplement-v1');
const phase = process.argv[2];
assert.ok(['before', 'after'].includes(phase));
const hash = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const source = JSON.parse(await readFile(path.join(root, 'implementation/2026-10-19-installed-scene/verification/darwin-v3/source-before.json')));
const report = JSON.parse(await readFile(path.join(root, 'implementation/2026-10-19-installed-scene/verification/darwin-v3/packaging-after/report.json')));
const receipt = JSON.parse(await readFile(path.join(root, 'implementation/2026-10-19-installed-scene/verification/darwin-v3/receipt.json')));
assert.equal(source.inputs.length, 893);
const sourceRows = [];
for (const item of source.inputs) {
  const actual = await hash(path.join(root, item.path));
  sourceRows.push({ path: item.path, expected: item.sha256, actual, matchesGate: actual === item.sha256 });
}
const tarballs = [];
for (const [name, item] of Object.entries(report.packages)) {
  const actual = await hash(path.join(root, item.file));
  tarballs.push({ name, path: item.file, expected: item.sha256, actual, matchesGate: actual === item.sha256 });
}
const compilerPath = receipt.debugCompiler.path;
const compilerHash = await hash(path.join(root, compilerPath));
const data = {
  phase,
  capturedAt: new Date().toISOString(),
  sourceInputCount: sourceRows.length,
  sourceMatches: sourceRows.every((x) => x.matchesGate),
  sourceRows,
  packageTarballs: tarballs,
  tarballsMatchGate: tarballs.every((x) => x.matchesGate),
  debugCompiler: { path: compilerPath, expected: receipt.debugCompiler.sha256AfterBuild, actual: compilerHash,
    matchesGate: compilerHash === receipt.debugCompiler.sha256AfterBuild },
};
await writeFile(path.join(proof, `${phase}-inputs.json`), JSON.stringify(data, null, 2) + '\n');
assert.ok(data.sourceMatches && data.tarballsMatchGate && data.debugCompiler.matchesGate,
  `Gate inputs changed before/after package-consumer supplement: ${phase}`);
console.log(JSON.stringify({ phase, sourceInputCount: data.sourceInputCount, sourceMatches: data.sourceMatches,
  tarballsMatchGate: data.tarballsMatchGate, debugCompiler: data.debugCompiler }, null, 2));
