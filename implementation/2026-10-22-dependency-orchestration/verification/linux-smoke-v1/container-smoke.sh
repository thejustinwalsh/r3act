#!/bin/sh
set -eu

REPO=/Volumes/Depot/Developer/r3act
PROOF="$REPO/implementation/2026-10-22-dependency-orchestration/proof-v3"
REPORT="$REPO/.cache/r3act-package-build/report.json"
CORE_TGZ="$REPO/.cache/r3act-package-build/tarballs/r3act-core.tgz"
VITE_TGZ="$REPO/.cache/r3act-package-build/tarballs/r3act-vite.tgz"
TMP=/tmp/r3act-linux-smoke-v1
mkdir -p "$TMP/core" "$TMP/vite"
tar -xzf "$CORE_TGZ" -C "$TMP/core"
tar -xzf "$VITE_TGZ" -C "$TMP/vite"

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = '/Volumes/Depot/Developer/r3act';
const proof = path.join(repo, 'implementation/2026-10-22-dependency-orchestration/proof-v3');
const reportPath = path.join(repo, '.cache/r3act-package-build/report.json');
const reportBytes = await readFile(reportPath);
const report = JSON.parse(reportBytes);
const lock = JSON.parse(await readFile(path.join(proof, 'input-lock.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(process.versions.node, '24.18.0');
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'arm64');
assert.equal(sha(reportBytes), lock.packageReport.sha256);
assert.equal(sha(await readFile(lock.packageReport.path)), lock.packageReport.sha256);
const verifiedPackages = [];
for (const [name, item] of Object.entries(report.packages)) {
  const bytes = await readFile(path.join(repo, item.file));
  assert.equal(bytes.length, item.bytes, `${name} tarball byte count`);
  assert.equal(sha(bytes), item.sha256, `${name} tarball hash`);
  const locked = lock.tarballs.find(row => row.path === path.join(repo, item.file));
  assert.ok(locked, `${name} tarball locked`);
  assert.equal(locked.sha256, item.sha256, `${name} tarball lock hash`);
  verifiedPackages.push({ name, bytes: bytes.length, sha256: item.sha256 });
}
assert.equal(report.platform, 'darwin-arm64');

const compilerManifestPath = '/tmp/r3act-linux-smoke-v1/vite/package/dist/compiler/bin/manifest.json';
const compilerManifest = JSON.parse(await readFile(compilerManifestPath));
assert.deepEqual(compilerManifest.artifacts.map(({ platform, arch, target }) => ({ platform, arch, target })),
  [{ platform: 'darwin', arch: 'arm64', target: 'aarch64-apple-darwin' }]);
const compiler = compilerManifest.artifacts[0];
const compilerPath = path.join('/tmp/r3act-linux-smoke-v1/vite/package/dist/compiler/bin', compiler.file);
const compilerBytes = await readFile(compilerPath);
assert.equal(compilerBytes.length, compiler.bytes);
assert.equal(sha(compilerBytes), compiler.sha256);
assert.equal(compilerBytes.subarray(0, 4).toString('hex'), 'cffaedfe');

const core = await import(pathToFileURL('/tmp/r3act-linux-smoke-v1/core/package/dist/src/native_runtime_api.js'));
for (const name of ['createStore', 'asyncTask', 'AsyncTaskDemandScope', 'defineProviderDemand', 'createNativeRoot', 'jsx', 'createWorld'])
  assert.equal(typeof core[name], 'function', `public export ${name}`);

const store = core.createStore(1);
store.dispatch(2);
assert.equal(store.getState(), 2);

const task = core.asyncTask('linux-smoke-task', async () => 7);
assert.equal(task.id, 'linux-smoke-task');
assert.equal(await task.run(new Map(), new AbortController().signal), 7);

const scope = new core.AsyncTaskDemandScope();
let starts = 0;
const provider = core.defineProviderDemand({}, 'linux-smoke-v1', async () => {
  starts++;
  return 'ready';
});
const identity = {};
const captures = [Object.freeze({ identity, version: 1, value: 'input' })];
const first = scope.acquire(provider, {}, captures);
const second = scope.acquire(provider, {}, captures);
assert.ok(first && second);
assert.strictEqual(first.resource, second.resource);
assert.equal(starts, 1);
assert.deepEqual(await Promise.all([first.result, second.result]), ['ready', 'ready']);
first.release();
second.release();
assert.equal(scope.size, 0);
scope.dispose();

const host = {
  createElement(tag) { return { kind: 'element', tag, props: {}, children: [], parent: null }; },
  createText(text) { return { kind: 'text', text, children: [], parent: null }; },
  setText(node, text) { node.text = text; },
  setProp(node, name, value) { node.props[name] = value; },
  place(parent, node, before) {
    if (node.parent) this.remove(node.parent, node);
    const index = before === null ? -1 : parent.children.indexOf(before);
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node);
    node.parent = parent;
  },
  remove(parent, node) {
    const index = parent.children.indexOf(node);
    if (index >= 0) parent.children.splice(index, 1);
    node.parent = null;
  },
};
const textContent = node => node.kind === 'text' ? node.text : node.children.map(textContent).join('');
const container = { kind: 'container', children: [], parent: null };
const root = core.createNativeRoot(host, container, { scheduleCommit() {} });
root.mount(core.jsx('p', { id: 'linux-smoke' }, 'before'));
assert.equal(container.children[0].tag, 'p');
assert.equal(container.children[0].props.id, 'linux-smoke');
assert.equal(textContent(container.children[0]), 'before');
root.update(core.jsx('p', { id: 'linux-smoke' }, 'after'));
assert.equal(textContent(container.children[0]), 'after');
root.dispose();
assert.equal(container.children.length, 0);

console.log(JSON.stringify({ status: 'PASS_LINUX_PACKAGED_CORE_SMOKE',
  node: process.version, platform: `${process.platform}/${process.arch}`,
  packages: verifiedPackages, reportSha256: sha(reportBytes),
  publicExports: ['createStore', 'asyncTask', 'AsyncTaskDemandScope', 'defineProviderDemand', 'createNativeRoot', 'jsx', 'createWorld'],
  store: 'dispatch/getState', task: 'explicit authored asyncTask callback',
  providerLease: { starts, sharedResource: true, finalScopeSize: scope.size },
  host: { mountedAndUpdated: true, disposed: true },
  compiler: { target: compiler.target, platform: compiler.platform, arch: compiler.arch,
    sha256: compiler.sha256, bytes: compiler.bytes, executableOnLinux: false } }));
NODE
