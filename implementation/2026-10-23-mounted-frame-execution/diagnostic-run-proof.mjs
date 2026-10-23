import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, '../..');
const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
assert.ok(args.includes('--proof-dir') && args.includes('--portless-cli'),
  'usage: node run-proof.mjs --proof-dir ABSOLUTE_DIRECTORY --portless-cli ABSOLUTE_CLI');
const proof = value('--proof-dir');
const cli = value('--portless-cli');
assert.ok(path.isAbsolute(proof) && path.isAbsolute(cli), 'proof and CLI paths must be absolute');
assert.ok(path.resolve(proof).startsWith(`${unit}${path.sep}`), 'proof must be inside this unit');
assert.ok(existsSync(cli), 'pinned installed Portless CLI is absent');
assert.equal(process.version, 'v24.18.0', 'use the frozen Node 24.18.0');
await mkdir(proof, { recursive: false });
const sourcePath = path.join(root, 'src/browser/native_three_host.tsx');
const original = await readFile(sourcePath);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await writeFile(path.join(proof, 'original-source.tsx'), original, { flag: 'wx' });
const privateDir = await mkdtemp(path.join(tmpdir(), 'r3act-hmr-proof-'));
const state = path.join(privateDir, 'portless-state');
const cert = path.join(privateDir, 'localhost.crt');
const key = path.join(privateDir, 'localhost.key');
const alias = `r3act-hmr-${randomBytes(5).toString('hex')}`;
const hostname = `${alias}.localhost`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const receipt = { status: 'STARTING', startedAt: new Date().toISOString(), root, proof,
  cli, cliSha256: sha256(await readFile(cli)), alias, hostname,
  originalSha256: sha256(original), proxyPort: null, appPort: null,
  proxy: null, server: null, verifier: null, routeRegistered: false,
  routeRemoved: false, listenersClosed: null, sourceRestored: null,
  serverEvidence: null, verifierResult: null, stopReason: null, errors: [] };
const receiptPath = path.join(proof, 'attempt-receipt.json');
const save = () => writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
await save();
const spawnLogged = (name, command, argv, env = process.env) => {
  const child = spawn(command, argv, { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const maxLogBytes = 1024 * 1024;
  const streams = { stdout: { chunks: [], kept: 0, dropped: 0 },
    stderr: { chunks: [], kept: 0, dropped: 0 } };
  for (const name of ['stdout', 'stderr']) child[name].on('data', bytes => {
    const stream = streams[name];
    const keep = Math.min(bytes.length, maxLogBytes - stream.kept);
    if (keep) { stream.chunks.push(bytes.subarray(0, keep)); stream.kept += keep; }
    stream.dropped += bytes.length - keep;
  });
  let spawnError = null;
  child.on('error', error => { spawnError = String(error); });
  let outcome;
  const done = new Promise(resolve => child.once('close', async (code, signal) => {
    try {
      await Promise.all([
        writeFile(path.join(proof, `${name}.stdout.log`), Buffer.concat(streams.stdout.chunks), { flag: 'wx' }),
        writeFile(path.join(proof, `${name}.stderr.log`), Buffer.concat(streams.stderr.chunks), { flag: 'wx' }),
      ]);
    } catch (error) { receipt.errors.push(`${name} log: ${String(error)}`); }
    outcome = { pid: child.pid ?? null, code, signal, spawnError,
      logs: Object.fromEntries(Object.entries(streams).map(([name, stream]) =>
        [name, { retainedBytes: stream.kept, droppedBytes: stream.dropped }])) };
    resolve(outcome);
  }));
  return { child, done, outcome: () => outcome };
};
const signal = (run, name) => {
  if (!run?.child.pid || run.outcome()) return;
  try { process.kill(-run.child.pid, name); }
  catch (error) { if (error?.code !== 'ESRCH') receipt.errors.push(`signal ${name}: ${String(error)}`); }
};
const stop = async run => {
  if (!run) return null;
  signal(run, 'SIGINT');
  if (!await Promise.race([run.done.then(() => true), delay(3000).then(() => false)])) {
    signal(run, 'SIGKILL');
    if (!await Promise.race([run.done.then(() => true), delay(1500).then(() => false)])) {
      receipt.errors.push(`owned ${run.child.pid} close unconfirmed after SIGKILL`);
      run.child.stdout.destroy(); run.child.stderr.destroy(); run.child.unref();
    }
  }
  return run.outcome() ?? { pid: run.child.pid, closeUnconfirmed: true };
};
const invoke = async (name, command, argv, env = process.env, timeout = 10000) => {
  const run = spawnLogged(name, command, argv, env);
  const result = await Promise.race([run.done, delay(timeout).then(() => null)]);
  if (!result) { await stop(run); throw new Error(`${name} timed out`); }
  assert.equal(result.code, 0, `${name} exited ${result.code ?? result.signal}`);
  return result;
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(error => error ? reject(error) : resolve(port));
  });
});
const accepts = port => new Promise(resolve => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.setTimeout(500);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
});
const httpsReady = (port, ca) => new Promise((resolve, reject) => {
  const request = https.get({ hostname, port, path: '/native-three-host.html', ca,
    rejectUnauthorized: true, family: 4,
    lookup: (_hostname, options, callback) => options?.all
      ? callback(null, [{ address: '127.0.0.1', family: 4 }])
      : callback(null, '127.0.0.1', 4) }, response => {
    response.resume();
    response.once('end', () => response.statusCode === 200
      ? resolve({ status: 200, authorized: true })
      : reject(new Error(`HTTPS readiness returned ${response.statusCode}`)));
  });
  request.setTimeout(2000, () => request.destroy(new Error('HTTPS readiness timeout')));
  request.once('error', reject);
});
let proxy, server, verifier, deadline, escalation, resolveInterrupted;
const interrupted = new Promise(resolve => { resolveInterrupted = resolve; });
const onSignal = name => {
  receipt.stopReason ??= name;
  signal(verifier, 'SIGINT'); signal(server, 'SIGINT');
  if (!server && !verifier) signal(proxy, 'SIGINT');
  resolveInterrupted(receipt.stopReason);
  escalation ??= setTimeout(() => {
    signal(verifier, 'SIGKILL'); signal(server, 'SIGKILL');
  }, 3000);
};
const onInt = () => onSignal('SIGINT');
const onTerm = () => onSignal('SIGTERM');
process.once('SIGINT', onInt); process.once('SIGTERM', onTerm);
try {
  deadline = setTimeout(() => onSignal('deadline-150s'), 150_000);
  await invoke('tls-generation', 'openssl', ['req', '-x509', '-newkey', 'rsa:2048',
    '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost',
    '-addext', `subjectAltName=DNS:localhost,DNS:${hostname}`]);
  receipt.proxyPort = await freePort();
  receipt.appPort = await freePort();
  assert.notEqual(receipt.proxyPort, receipt.appPort);
  const env = { ...process.env, PORTLESS_STATE_DIR: state, PORTLESS_PORT: String(receipt.proxyPort),
    PORTLESS_HTTPS: '1', PORTLESS_TLD: 'localhost', PORTLESS_SYNC_HOSTS: '0',
    PORTLESS_LAN: '0', CI: '1', HOST: '127.0.0.1', PORT: String(receipt.appPort),
    CHOKIDAR_USEPOLLING: '1', CHOKIDAR_INTERVAL: '100' };
  proxy = spawnLogged('proxy', process.execPath, [cli, 'proxy', 'start', '--foreground',
    '--skip-trust', '--https', '--port', String(receipt.proxyPort), '--tld', 'localhost',
    '--cert', cert, '--key', key], env);
  const proxyDeadline = Date.now() + 15000;
  while (!await accepts(receipt.proxyPort) && Date.now() < proxyDeadline) {
    assert.ok(!proxy.outcome() && !receipt.stopReason, 'owned proxy exited or interrupted');
    await delay(150);
  }
  assert.ok(await accepts(receipt.proxyPort), 'owned Portless proxy did not listen');
  await invoke('alias-add', process.execPath, [cli, 'alias', alias, String(receipt.appPort)], env);
  receipt.routeRegistered = true;
  server = spawnLogged('server', process.execPath, [path.join(unit, 'diagnostic-serve-workbench.mjs')],
    { ...env, R3ACT_HMR_EVIDENCE: path.join(proof, 'server-evidence.json') });
  const readyDeadline = Date.now() + 35000;
  while (Date.now() < readyDeadline) {
    assert.ok(!receipt.stopReason && !server.outcome(), 'server exited or proof interrupted before readiness');
    try {
      const evidence = JSON.parse(await readFile(path.join(proof, 'server-evidence.json'), 'utf8'));
      if (evidence.status === 'FAILED') throw new Error(evidence.error);
      if (evidence.status === 'READY') {
        assert.equal(evidence.watcher.targetListed, true);
        assert.equal(evidence.watcher.transform.moduleFile, sourcePath);
        receipt.serverEvidence = { ready: true, transform: evidence.watcher.transform };
        const ready = await httpsReady(receipt.proxyPort, await readFile(cert));
        receipt.httpsReadiness = ready;
        break;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT' && !String(error).includes('HTTPS readiness')) throw error;
    }
    await delay(200);
  }
  assert.ok(receipt.httpsReadiness, 'exact source membership and HTTPS readiness timed out');
  assert.equal(sha256(await readFile(sourcePath)), receipt.originalSha256,
    'source changed before controlled verifier edit');
  await save();
  verifier = spawnLogged('verifier', process.execPath, [path.join(unit, 'verify-three.mjs')],
    { ...env, NATIVE_TEST_ORIGIN: `https://${hostname}:${receipt.proxyPort}`,
      NATIVE_THREE_RESULT_DIR: path.join(proof, 'browser') });
  const verifierOutcome = await Promise.race([verifier.done, interrupted.then(() => null)]);
  if (!verifierOutcome) throw new Error(`verifier interrupted: ${receipt.stopReason}`);
  receipt.verifier = verifierOutcome;
  assert.equal(receipt.verifier.code, 0, 'browser verifier failed');
  const result = JSON.parse(await readFile(path.join(proof, 'browser/results.json'), 'utf8'));
  assert.equal(result.status, 'PASS');
  let evidence;
  const eventDeadline = Date.now() + 2000;
  do {
    evidence = JSON.parse(await readFile(path.join(proof, 'server-evidence.json'), 'utf8'));
    if (evidence.events.some(event => event.kind === 'watcher-change')
      && evidence.events.some(event => event.event === 'r3act:invalidate-native-module')
      && evidence.events.some(event => event.type === 'full-reload')) break;
    await delay(100);
  } while (Date.now() < eventDeadline);
  for (const kind of ['watcher-change', 'ws-send']) assert.ok(evidence.events.some(event => event.kind === kind), `${kind} absent`);
  assert.ok(evidence.events.some(event => event.kind === 'ws-send' && event.event === 'r3act:invalidate-native-module'
    && event.previousRevision && event.previousInstance), 'revision/instance invalidation absent');
  assert.ok(evidence.events.some(event => event.kind === 'ws-send' && event.type === 'full-reload'), 'full reload absent');
  receipt.serverEvidence = { ...receipt.serverEvidence, events: evidence.events };
  receipt.verifierResult = 'PASS';
} catch (error) {
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  receipt.verifier = await stop(verifier) ?? receipt.verifier;
  receipt.server = await stop(server);
  try {
    const actual = await readFile(sourcePath);
    if (sha256(actual) !== receipt.originalSha256) await writeFile(sourcePath, original);
    receipt.sourceRestored = sha256(await readFile(sourcePath)) === receipt.originalSha256;
    assert.equal(receipt.sourceRestored, true, 'source bytes were not restored exactly');
  } catch (error) { receipt.errors.push(`restore: ${String(error)}`); }
  if (receipt.routeRegistered) {
    try {
      const env = { ...process.env, PORTLESS_STATE_DIR: state, PORTLESS_PORT: String(receipt.proxyPort),
        PORTLESS_SYNC_HOSTS: '0', CI: '1' };
      await invoke('alias-remove', process.execPath, [cli, 'alias', '--remove', alias], env);
      receipt.routeRemoved = true;
    } catch (error) { receipt.errors.push(`alias removal: ${String(error)}`); }
  } else receipt.routeRemoved = true;
  receipt.proxy = await stop(proxy);
  try {
    receipt.listenersClosed = (!receipt.proxyPort || !await accepts(receipt.proxyPort))
      && (!receipt.appPort || !await accepts(receipt.appPort));
    assert.equal(receipt.listenersClosed, true, 'owned listener remained open');
    if (existsSync(path.join(state, 'routes.json'))) {
      const routes = JSON.parse(await readFile(path.join(state, 'routes.json'), 'utf8'));
      assert.ok(!routes.some(route => route.hostname === hostname), 'owned alias remains');
    }
  } catch (error) { receipt.errors.push(`cleanup: ${String(error)}`); }
  clearTimeout(deadline);
  clearTimeout(escalation);
  process.off('SIGINT', onInt); process.off('SIGTERM', onTerm);
  try {
    await Promise.all([rm(cert, { force: true }), rm(key, { force: true })]);
    receipt.privateTlsRemoved = true;
    if (receipt.routeRemoved && receipt.listenersClosed)
      await rm(privateDir, { recursive: true, force: true });
  } catch (error) { receipt.errors.push(`private TLS cleanup: ${String(error)}`); }
  receipt.status = receipt.errors.length === 0 && !receipt.stopReason && receipt.verifierResult === 'PASS'
    && receipt.sourceRestored && receipt.routeRemoved && receipt.listenersClosed && receipt.privateTlsRemoved
    ? 'PASS_HMR_DELIVERY' : 'FAIL_OR_INCOMPLETE';
  receipt.finishedAt = new Date().toISOString();
  await save();
}
if (receipt.status !== 'PASS_HMR_DELIVERY') {
  console.error(receipt.errors.join('\n'));
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receiptPath }));
