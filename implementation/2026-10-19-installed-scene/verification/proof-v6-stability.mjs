import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const unit = 'implementation/2026-10-19-installed-scene';
const proofDirs = { v5: path.join(unit, 'proof-v5'), v6: path.join(unit, 'proof-v6') };
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const hash = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const builds = {};
for (const [version, dir] of Object.entries(proofDirs)) builds[version] = {
  dir,
  proof: await readJson(path.join(root, dir, 'build-proof.json')),
  pair: await readJson(path.join(root, dir, 'pair-proof.json')),
  lock: await readJson(path.join(root, dir, 'input-lock.json')),
};
const checks = { inputHashes: {}, productionAssets: {}, stableInstalledGraph: {}, compiler: {}, wrapper: {}, transforms: {} };
const failures = [];
const record = (group, key, ok, details = {}) => {
  checks[group][key] = { status: ok ? 'MATCH' : 'MISMATCH', ...details };
  if (!ok) failures.push(`${group}/${key}`);
};
const equalJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const version of ['v5', 'v6']) {
  const { dir, proof, pair, lock } = builds[version];
  const rows = [];
  for (const item of lock.source) {
    const current = await hash(path.join(root, item.path));
    const archived = item.path.startsWith(`${unit}/proof-`) ? null :
      await hash(path.join(root, dir, 'inputs/source', item.path));
    rows.push({ path: item.path, expected: item.sha256, current, archived,
      matches: current === item.sha256 && (archived === null || archived === item.sha256) });
  }
  for (const item of lock.consumerCopies) {
    const actual = await hash(item.path);
    rows.push({ path: item.path, expected: item.sha256, current: actual, archived: actual, matches: actual === item.sha256 });
  }
  for (const item of lock.tarballs) {
    const actual = await hash(path.join(root, item.path));
    const archived = actual;
    rows.push({ path: item.path, expected: item.sha256, current: actual, archived, matches: actual === item.sha256 && archived === item.sha256 });
  }
  for (const pkg of lock.installedGraph) for (const file of pkg.files) {
    const archived = await hash(path.join(root, pkg.root, file.path));
    const consumed = await hash(path.join(pkg.consumerRoot, file.path));
    rows.push({ path: `${pkg.name}/${file.path}`, expected: file.sha256, current: consumed, archived, matches: archived === file.sha256 && consumed === file.sha256 });
  }
  const compilerArchive = await hash(path.join(root, lock.compiler.path));
  const compilerConsumer = await hash(lock.compiler.consumerPath);
  rows.push({ path: 'compiler', expected: lock.compiler.sha256, current: compilerConsumer, archived: compilerArchive,
    matches: compilerArchive === lock.compiler.sha256 && compilerConsumer === lock.compiler.sha256 });
  for (const item of proof.transforms) {
    const actual = await hash(path.join(root, item.path));
    rows.push({ path: item.path, expected: item.sha256, current: actual, archived: actual, matches: actual === item.sha256 });
  }
  for (const item of proof.assets) {
    const actual = await hash(path.join(root, item.path));
    rows.push({ path: item.path, expected: item.sha256, current: actual, archived: actual, matches: actual === item.sha256 });
  }
  for (const arm of ['native', 'react']) {
    for (const item of pair.assets[arm]) {
      const actual = await hash(path.join(root, dir, 'comparison-proof/dist', arm, item.path));
      rows.push({ path: `${arm}/${item.path}`, expected: item.sha256, current: actual, archived: actual, matches: actual === item.sha256 });
    }
    for (const item of pair.transforms[arm]) {
      const actual = await hash(path.join(root, dir, 'comparison-proof/transforms', arm, item.path));
      rows.push({ path: `${arm}/${item.path}`, expected: item.sha256, current: actual, archived: actual, matches: actual === item.sha256 });
    }
  }
  const beforeOk = pair.inputBefore.every((x) => x.expected === x.current && x.current === x.archived);
  const afterOk = pair.inputAfter.every((x) => x.expected === x.current && x.current === x.archived);
  const lockOk = rows.every((x) => x.matches);
  record('inputHashes', version, lockOk && beforeOk && afterOk, {
    checkedRows: rows.length, mismatches: rows.filter((x) => !x.matches).map((x) => x.path),
    pairBeforeRows: pair.inputBefore.length, pairAfterRows: pair.inputAfter.length,
    pairBeforeMismatches: pair.inputBefore.filter((x) => x.expected !== x.current || x.current !== x.archived).map((x) => x.path),
    pairAfterMismatches: pair.inputAfter.filter((x) => x.expected !== x.current || x.current !== x.archived).map((x) => x.path),
  });
  assert.equal(proof.status, 'PASS_SCENE_BUILD_PROOF');
  assert.equal(pair.status, 'PASS_UNTIMED_PAIR_PROOF');
}

const assetMap = (version, mode) => {
  const { proof, pair } = builds[version];
  const items = mode === 'scene' ? proof.assets.filter((x) => x.mode === 'scene') : pair.assets[mode];
  return Object.fromEntries(items.filter((x) => !x.path.endsWith('index.html') || mode !== 'scene')
    .map((x) => [x.path.split('/').at(-1) === 'index.html' ? 'index.html' : (x.urlPath ?? x.path).split('/').at(-1), { bytes: x.bytes, sha256: x.sha256 }]));
};
for (const mode of ['scene', 'native', 'react']) {
  const left = assetMap('v5', mode), right = assetMap('v6', mode);
  record('productionAssets', mode, equalJson(left, right), { proofV5: left, proofV6: right });
}
const graphShape = (version) => builds[version].lock.installedGraph.map((pkg) => ({
  name: pkg.name, version: pkg.version, files: pkg.files.map((f) => ({ path: f.path, sha256: f.sha256 })).sort((a,b)=>a.path.localeCompare(b.path)),
})).sort((a,b)=>a.name.localeCompare(b.name));
record('stableInstalledGraph', 'all-packages', equalJson(graphShape('v5'), graphShape('v6')),
  { packageCount: graphShape('v6').length });
for (const field of ['sha256', 'target']) record('compiler', field,
  builds.v5.proof.compiler[field] === builds.v6.proof.compiler[field],
  { proofV5: builds.v5.proof.compiler[field], proofV6: builds.v6.proof.compiler[field] });
record('wrapper', 'package-input', builds.v5.proof.wrapperInput.sha256 === builds.v6.proof.wrapperInput.sha256 &&
  builds.v5.proof.wrapperInput.unchangedInstalledPackageInput && builds.v6.proof.wrapperInput.unchangedInstalledPackageInput,
  { proofV5: builds.v5.proof.wrapperInput, proofV6: builds.v6.proof.wrapperInput });
for (const side of ['input', 'output']) {
  const left = await hash(path.join(root, proofDirs.v5, `wrapper-${side}/scene/react_radix_dialog_adapter.js`));
  const right = await hash(path.join(root, proofDirs.v6, `wrapper-${side}/scene/react_radix_dialog_adapter.js`));
  record('wrapper', side, left === right, { proofV5: left, proofV6: right });
}
const transformShape = (version) => builds[version].proof.transforms.map((x) => ({ path: x.path.split('/').slice(-3).join('/'), bytes: x.bytes, sha256: x.sha256 })).sort((a,b)=>a.path.localeCompare(b.path));
record('transforms', 'scene', equalJson(transformShape('v5'), transformShape('v6')),
  { proofV5: transformShape('v5'), proofV6: transformShape('v6') });
const result = { schemaVersion: 1, status: failures.length ? 'FAIL' : 'PASS', proofV5: proofDirs.v5,
  proofV6: proofDirs.v6, checks, failures };
const output = path.join(root, unit, 'verification/proof-v6-stability.json');
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, output, inputRowsV5: checks.inputHashes.v5.checkedRows,
  inputRowsV6: checks.inputHashes.v6.checkedRows, pairBeforeV6: checks.inputHashes.v6.pairBeforeRows,
  pairAfterV6: checks.inputHashes.v6.pairAfterRows, assets: Object.fromEntries(Object.entries(checks.productionAssets).map(([k,v])=>[k,v.status])),
  compiler: checks.compiler, wrapper: Object.fromEntries(Object.entries(checks.wrapper).map(([k,v])=>[k,v.status])),
  stableInstalledGraph: checks.stableInstalledGraph['all-packages'].status, failures }, null, 2));
assert.equal(result.status, 'PASS');
