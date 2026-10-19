import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import https from "node:https";
import net from "node:net";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir") && args.includes("--portless-cli"),
  "usage: node run-browser.mjs --proof-dir DIR --portless-cli ABSOLUTE_PORTLESS_CLI");
const proof = path.resolve(root, option("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`));
const cli = path.resolve(option("--portless-cli"));
assert.equal(cli, option("--portless-cli"), "Portless CLI must be an absolute path");
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const report = JSON.parse(await readFile(path.join(proof, "build-proof.json"), "utf8"));
assert.equal(report.status, "PASS_INSTALLED_BUILD_PROOF");
const consumer = await realpath(report.consumer);
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-installed-hmr-"));
const vite = path.join(consumer, "node_modules/.bin/vite");
await realpath(vite);
const cliSha256 = sha(await readFile(cli));
const stateDir = process.env.PORTLESS_STATE_DIR ?? path.join(homedir(), ".portless");
const routesFile = path.join(stateDir, "routes.json");
const caFile = path.join(stateDir, "ca.pem");
const ca = await readFile(caFile);
const proxyPort = Number((await readFile(path.join(stateDir, "proxy.port"), "utf8")).trim());
const proxyPid = Number((await readFile(path.join(stateDir, "proxy.pid"), "utf8")).trim());
assert.equal(proxyPort, 1355, "the existing shared HTTPS proxy must remain on port 1355");
assert.equal((await readFile(path.join(stateDir, "proxy.tls"), "utf8")).trim(), "1");
process.kill(proxyPid, 0);
const readRoutes = async () => JSON.parse(await readFile(routesFile, "utf8"));
const routesBefore = await readRoutes();
assert.ok(Array.isArray(routesBefore));
const alias = `r3act-hmr-${randomBytes(4).toString("hex")}`;
const hostname = `${alias}.localhost`;
assert.ok(!routesBefore.some(route => route.hostname === hostname));
const origin = `https://${hostname}:${proxyPort}/`;
const env = { ...process.env, PORTLESS_PORT: String(proxyPort), PORTLESS_HTTPS: "1",
  PORTLESS_TLD: "localhost", PORTLESS_SYNC_HOSTS: "0", CI: "1",
  NODE_EXTRA_CA_CERTS: caFile };
const receiptPath = path.join(proof, "browser-server.json");
const receipt = { status: "STARTED", alias, origin, consumer, cli, cliSha256,
  command: [process.execPath, cli, alias, vite], env: { PORTLESS_PORT: env.PORTLESS_PORT,
    PORTLESS_HTTPS: env.PORTLESS_HTTPS, PORTLESS_TLD: env.PORTLESS_TLD,
    PORTLESS_SYNC_HOSTS: env.PORTLESS_SYNC_HOSTS, NODE_EXTRA_CA_CERTS: env.NODE_EXTRA_CA_CERTS },
  proxyPid, proxyPort, routesBefore, routesDuring: null, routesAfter: null,
  readiness: null, assignedPort: null, portClosed: null,
  server: null, verifier: null, stopReason: null, errors: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });

let server, verifier, timer, serverRun, verifierRun;
let serverExit, verifierExit;
const spawnLogged = (name, command, argv) => {
  const child = spawn(command, argv, { cwd: consumer, env, detached: true,
    stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let spawnError = null;
  let persistPromise, outcome = null;
  child.on("error", error => { spawnError = String(error); });
  const persistLogs = async () => {
    persistPromise ??= Promise.all([
      writeFile(path.join(proof, `${name}.stdout.log`), Buffer.concat(stdout), { flag: "wx" }),
      writeFile(path.join(proof, `${name}.stderr.log`), Buffer.concat(stderr), { flag: "wx" }),
    ]);
    await persistPromise;
  };
  const exit = new Promise(resolve => child.once("close", async (code, signal) => {
    let logError = null;
    try { await persistLogs(); } catch (error) { logError = String(error); }
    outcome = { pid: child.pid ?? null, code, signal, spawnError, logError };
    resolve(outcome);
  }));
  return { child, exit, persistLogs, outcome: () => outcome };
};
const signalGroup = (child, signal) => {
  if (child?.pid && child.exitCode === null && child.signalCode === null)
    try { process.kill(-child.pid, signal); } catch (error) {
    if (error?.code !== "ESRCH") receipt.errors.push(`signal ${signal}: ${String(error)}`);
  }
};
let escalation;
let rejectStop;
const stopped = new Promise((_, reject) => { rejectStop = reject; });
void stopped.catch(() => {});
const stop = reason => {
  receipt.stopReason ??= reason;
  rejectStop(new Error(`stopped: ${receipt.stopReason}`));
  signalGroup(verifier, "SIGINT");
  signalGroup(server, "SIGINT");
  escalation ??= setTimeout(() => {
    signalGroup(verifier, "SIGKILL");
    signalGroup(server, "SIGKILL");
  }, 3000);
};
const interrupt = () => stop("signal");
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);
const ready = () => new Promise((resolve, reject) => {
  const request = https.get({ hostname, port: proxyPort, path: "/", ca,
    rejectUnauthorized: true, family: 4,
    lookup: (_name, options, callback) => options?.all
      ? callback(null, [{ address: "127.0.0.1", family: 4 }])
      : callback(null, "127.0.0.1", 4) }, response => {
    response.resume();
    response.on("end", () => response.statusCode === 200
      ? resolve({ status: response.statusCode, authorized: true })
      : reject(new Error(`HTTPS readiness returned ${response.statusCode}`)));
  });
  request.setTimeout(2000, () => request.destroy(new Error("HTTPS readiness timeout")));
  request.once("error", reject);
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const portAccepts = port => new Promise(resolve => {
  const socket = net.connect({ host: "127.0.0.1", port });
  socket.setTimeout(500);
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("error", () => resolve(false));
  socket.once("timeout", () => { socket.destroy(); resolve(false); });
});
try {
  timer = setTimeout(() => stop("deadline-150s"), 150_000);
  serverRun = spawnLogged("hmr-server", process.execPath, [cli, alias, vite]);
  server = serverRun.child;
  serverExit = serverRun.exit;
  const readinessDeadline = Date.now() + 30_000;
  while (Date.now() < readinessDeadline) {
    if (receipt.stopReason) throw new Error(`stopped: ${receipt.stopReason}`);
    const routes = await readRoutes();
    const ours = routes.find(route => route.hostname === hostname);
    if (ours) {
      assert.equal(ours.pid, server.pid, "Portless route belongs to a different process");
      receipt.assignedPort = ours.port;
      receipt.routesDuring = routes;
      try { receipt.readiness = await ready(); break; } catch {}
    }
    await delay(300);
  }
  assert.ok(receipt.readiness, "owned HTTPS route did not become ready within 30 seconds");
  verifierRun = spawnLogged("hmr-verifier", process.execPath,
    [path.join(unit, "verify-browser.mjs"), "--proof-dir", proof,
      "--origin", origin, "--invalid-edit"]);
  verifier = verifierRun.child;
  verifierExit = verifierRun.exit;
  receipt.verifier = await Promise.race([verifierExit, stopped]);
  assert.equal(receipt.verifier.code, 0, "browser verifier failed; raw receipt and logs are preserved");
  assert.equal(receipt.stopReason, null);
  const browserProof = JSON.parse(await readFile(path.join(proof, "browser-hmr.json"), "utf8"));
  assert.equal(browserProof.status, "PASS_INSTALLED_HMR_BROWSER");
} catch (error) {
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  signalGroup(verifier, "SIGINT");
  signalGroup(server, "SIGINT");
  const exits = [serverExit, verifierExit].filter(Boolean);
  if (exits.length) {
    const settled = Promise.allSettled(exits);
    let closed = await Promise.race([settled.then(() => true), delay(3000).then(() => false)]);
    if (!closed) {
      signalGroup(verifier, "SIGKILL");
      signalGroup(server, "SIGKILL");
      closed = await Promise.race([settled.then(() => true), delay(1000).then(() => false)]);
    }
    if (!closed) {
      for (const run of [serverRun, verifierRun].filter(Boolean)) {
        if (run.outcome()) continue;
        run.child.stdout.destroy();
        run.child.stderr.destroy();
        run.child.unref();
        try { await run.persistLogs(); } catch (error) { receipt.errors.push(String(error)); }
      }
      receipt.errors.push("owned child close remained unconfirmed after SIGKILL");
    }
    receipt.server = serverRun?.outcome() ?? (serverRun ? { pid: server?.pid, closeUnconfirmed: true } : null);
    receipt.verifier = verifierRun?.outcome() ??
      (verifierRun ? { pid: verifier?.pid, closeUnconfirmed: true } : null);
  }
  if (timer) clearTimeout(timer);
  if (escalation) clearTimeout(escalation);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  try {
    receipt.routesAfter = await readRoutes();
    const remaining = receipt.routesAfter.find(route => route.hostname === hostname);
    if (remaining) {
      assert.equal(remaining.pid, server?.pid, "owned alias was taken by another process");
      receipt.errors.push("owned Portless route remained after its server exited; preserve it for scoped cleanup");
    }
    if (receipt.assignedPort !== null) {
      receipt.portClosed = !(await portAccepts(receipt.assignedPort));
      assert.equal(receipt.portClosed, true, "owned Vite port still accepts connections");
    }
    for (const route of routesBefore)
      assert.ok(receipt.routesAfter.some(current => JSON.stringify(current) === JSON.stringify(route)),
        `shared route changed: ${route.hostname}`);
    assert.equal(Number((await readFile(path.join(stateDir, "proxy.pid"), "utf8")).trim()), proxyPid);
    process.kill(proxyPid, 0);
  } catch (error) { receipt.errors.push(String(error)); }
  receipt.status = receipt.errors.length || receipt.stopReason || receipt.verifier?.code !== 0 ||
    receipt.server?.logError || receipt.verifier?.logError || !receipt.portClosed ||
    receipt.routesAfter?.some(route => route.hostname === hostname)
    ? "FAIL_OR_INCOMPLETE" : "PASS_PORTLESS_INSTALLED_HMR";
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
if (receipt.status !== "PASS_PORTLESS_INSTALLED_HMR") {
  console.error(receipt.errors.join("\n"));
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receiptPath, origin }));
