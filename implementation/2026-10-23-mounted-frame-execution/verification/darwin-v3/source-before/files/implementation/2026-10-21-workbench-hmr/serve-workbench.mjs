import assert from 'node:assert/strict';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, '../..');
const target = path.join(root, 'src/browser/native_three_host.tsx');
const ignoredRoots = ['implementation', 'results', '.cache', '.pnpm-store',
  'compiler/oxc-spike/target'].map(name => path.join(root, name));
const evidencePath = process.env.R3ACT_HMR_EVIDENCE;
assert.ok(evidencePath && path.isAbsolute(evidencePath), 'R3ACT_HMR_EVIDENCE must be an absolute path');
const port = Number(process.env.PORT);
assert.ok(Number.isInteger(port) && port > 0 && port < 65536, 'Portless must provide PORT');
const host = process.env.HOST ?? '127.0.0.1';
assert.ok(host === '127.0.0.1' || host === 'localhost' || host === '::1', 'host must be loopback');

const evidence = {
  status: 'STARTING', pid: process.pid, root, target, host, port,
  watcher: null, events: [], droppedEvents: 0, stopReason: null, error: null,
};
const record = event => {
  if (evidence.events.length < 48) evidence.events.push({ at: new Date().toISOString(), ...event });
  else evidence.droppedEvents++;
  void persist().catch(error => console.error('HMR evidence write failed:', error));
};
let writes = Promise.resolve();
const persist = () => {
  const snapshot = JSON.stringify(evidence, null, 2) + '\n';
  writes = writes.then(async () => {
    await mkdir(path.dirname(evidencePath), { recursive: true });
    const temporary = `${evidencePath}.${process.pid}.tmp`;
    await writeFile(temporary, snapshot);
    await rename(temporary, evidencePath);
  });
  return writes;
};
const persistSignal = () => {
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeFileSync(`${evidencePath}.signal.json`, JSON.stringify(evidence, null, 2) + '\n');
};

let server;
let closing;
let readyTimer;
let failReady;
const stop = reason => {
  evidence.stopReason ??= reason;
  if (server) return server.close();
  return persist();
};
const onSignal = reason => {
  evidence.stopReason ??= reason;
  try { persistSignal(); } catch (error) { console.error(error); process.exitCode = 1; }
  void stop(reason).catch(error => { console.error(error); process.exitCode = 1; });
};
const onInterrupt = () => onSignal('SIGINT');
const onTerminate = () => onSignal('SIGTERM');
process.once('SIGINT', onInterrupt);
process.once('SIGTERM', onTerminate);

try {
  server = await createServer({
    root, configFile: path.join(root, 'vite.config.ts'),
    server: { host, port, strictPort: true },
  });
  const originalClose = server.close;
  server.close = function (...args) {
    closing ??= (async () => {
      try { return await originalClose.apply(this, args); }
      finally {
        clearTimeout(readyTimer);
        failReady?.(new Error('server closed before watcher readiness'));
        failReady = undefined;
        evidence.status = evidence.status === 'READY' ? 'CLOSED' : evidence.status;
        await persist();
        process.off('SIGINT', onInterrupt);
        process.off('SIGTERM', onTerminate);
      }
    })();
    return closing;
  };
  const options = server.watcher.options;
  evidence.watcher = {
    usePolling: options.usePolling, useFsEvents: options.useFsEvents,
    interval: options.interval, ignored: options.ignored,
    ready: false, targetListed: false, ignoredDirectoryCounts: null,
  };
  assert.equal(options.usePolling, true, 'effective watcher did not select polling');
  assert.equal(options.useFsEvents, false, 'effective watcher still selected FsEvents');
  assert.equal(options.interval, 100, 'effective polling interval was not 100 ms');
  for (const ignoredRoot of ignoredRoots)
    assert.ok(options.ignored.includes(`${ignoredRoot}/**`), `missing ignored root: ${ignoredRoot}`);
  if (evidence.stopReason) throw new Error(`interrupted before listen: ${evidence.stopReason}`);

  const originalSend = server.ws.send;
  server.ws.send = function (...args) {
    const message = args[0];
    if (message?.type === 'full-reload' ||
        (message?.type === 'custom' && message.event === 'r3act:invalidate-native-module')) {
      record({ kind: 'ws-send', type: message.type, event: message.event ?? null,
        sourceFile: message.data?.sourceFile ?? null,
        previousRevision: message.data?.previousRevision ?? null,
        previousInstance: message.data?.previousInstance ?? null,
        path: message.path ?? null });
    }
    return originalSend.apply(this, args);
  };
  server.watcher.on('change', file => {
    if (path.resolve(file) === target) record({ kind: 'watcher-change', file: target });
  });
  const watcherReady = new Promise((resolve, reject) => {
    failReady = reject;
    readyTimer = setTimeout(() => reject(new Error('watcher ready timed out after 15 seconds')), 15_000);
    const ready = () => { clearTimeout(readyTimer); failReady = undefined; resolve(); };
    server.watcher.once('ready', ready);
    if (server.watcher._readyEmitted) ready();
  });
  void watcherReady.catch(() => {});
  await server.listen();
  if (evidence.stopReason) throw new Error(`interrupted during listen: ${evidence.stopReason}`);
  await watcherReady;
  if (evidence.stopReason) throw new Error(`interrupted before ready: ${evidence.stopReason}`);
  const watched = server.watcher.getWatched();
  const listed = (watched[path.dirname(target)] ?? []).includes(path.basename(target));
  evidence.watcher.ready = true;
  evidence.watcher.targetListed = listed;
  evidence.watcher.watchedDirectoryCount = Object.keys(watched).length;
  evidence.watcher.ignoredDirectoryCounts = Object.fromEntries(ignoredRoots.map(ignoredRoot =>
    [ignoredRoot, Object.keys(watched).filter(directory => directory === ignoredRoot ||
      directory.startsWith(`${ignoredRoot}${path.sep}`)).length]));
  assert.ok(listed, 'target source is absent from the ready watcher');
  for (const [ignoredRoot, count] of Object.entries(evidence.watcher.ignoredDirectoryCounts))
    assert.equal(count, 0, `watcher traversed ignored root: ${ignoredRoot}`);
  evidence.status = 'READY';
  await persist();
  console.log(JSON.stringify({ status: 'READY', pid: process.pid, port, evidencePath }));
} catch (error) {
  clearTimeout(readyTimer);
  evidence.status = 'FAILED';
  evidence.error = error instanceof Error ? error.stack ?? String(error) : String(error);
  try { await stop('startup-failure'); } catch (closeError) {
    evidence.error += `\nclose: ${String(closeError)}`;
  }
  await persist();
  console.error(evidence.error);
  process.exitCode = 1;
}
