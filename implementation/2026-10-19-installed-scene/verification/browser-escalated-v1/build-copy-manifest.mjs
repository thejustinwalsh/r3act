import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const unit = 'implementation/2026-10-19-installed-scene';
const original = path.join(unit, 'proof-v3');
const copy = path.join(unit, 'proof-v3-browser-escalated');
const output = path.join(unit, 'verification/browser-escalated-v1/supplement-copy-manifest.json');
const hash = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const collect = async (base, relative = '') => {
  const rows = [];
  for (const entry of await readdir(path.join(base, relative), { withFileTypes: true })) {
    const item = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink ${item}`);
    if (entry.isDirectory()) rows.push(...await collect(base, item));
    else if (entry.isFile()) rows.push(item.split(path.sep).join('/'));
    else throw new Error(`Unexpected file type ${item}`);
  }
  return rows.sort();
};
const mappings = [
  ...['build-proof.json', 'pair-proof.json', 'input-lock.json'].map((file) => ({ from: file, to: file })),
  ...(await collect(path.join(original, 'inputs/source'))).map((file) => ({ from: `inputs/source/${file}`, to: `inputs/source/${file}` })),
  ...(await collect(path.join(original, 'comparison-proof/dist'))).map((file) => ({ from: `comparison-proof/dist/${file}`, to: `comparison-proof/dist/${file}` })),
];
const files = [];
for (const mapping of mappings) {
  const [originalHash, copyHash] = await Promise.all([hash(path.join(original, mapping.from)), hash(path.join(copy, mapping.to))]);
  files.push({ original: mapping.from, copy: mapping.to, originalSha256: originalHash, copySha256: copyHash, matches: originalHash === copyHash });
}
const proofHashes = Object.fromEntries(await Promise.all(['build-proof.json', 'pair-proof.json'].map(async (file) => [file, await hash(path.join(original, file))])));
assert.equal(proofHashes['build-proof.json'], '61fe8735966fae7eddea6a79e7d00b2445c14531e8dd5e5007bb2e8fa33b36ef');
assert.equal(proofHashes['pair-proof.json'], 'b9929c8579fe207c6e381da0885d78efe1b657794ae8d775ca9ffb462dec7e23');
const originalBrowserFailureSha256 = await hash(path.join(original, 'browser-conformance.json'));
const record = { schemaVersion: 1, createdAt: new Date().toISOString(), status: files.every((file) => file.matches) ? 'PASS' : 'FAIL',
  originalProof: 'proof-v3', copiedProof: 'proof-v3-browser-escalated', buildProofSha256: proofHashes['build-proof.json'],
  pairProofSha256: proofHashes['pair-proof.json'], originalBrowserFailureSha256,
  failedBrowserPid: { pid: 4129, readOnlyPsExitCode: 1, stdout: '', meaning: 'No process with PID 4129 was present.' },
  fileCount: files.length, files };
await writeFile(output, JSON.stringify(record, null, 2) + '\n');
assert.equal(record.status, 'PASS');
console.log(JSON.stringify({ status: record.status, fileCount: record.fileCount, buildProofSha256: record.buildProofSha256,
  pairProofSha256: record.pairProofSha256, originalBrowserFailureSha256 }, null, 2));
