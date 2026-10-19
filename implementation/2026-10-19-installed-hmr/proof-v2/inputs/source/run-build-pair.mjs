import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir") && args.includes("--phase"),
  "usage: node run-build-pair.mjs --proof-dir DIR --phase proof|measure");
const proof = path.resolve(root, option("--proof-dir"));
const phase = option("--phase");
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.ok(["proof", "measure"].includes(phase));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildProofBytes = await readFile(path.join(proof, "build-proof.json"));
const buildProof = JSON.parse(buildProofBytes);
assert.equal(buildProof.status, "PASS_INSTALLED_BUILD_PROOF");
const consumer = buildProof.consumer;
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-installed-hmr-"));
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const verify = async () => {
  const rows = [];
  for (const item of lock.source) {
    const current = await hash(path.join(unit, item.relative));
    const archived = await hash(path.join(proof, "inputs", "source", item.relative));
    rows.push({ path: item.relative, expected: item.sha256, current, archived });
    assert.equal(current, item.sha256);
    assert.equal(archived, item.sha256);
    if (item.relative.startsWith("consumer/comparison/"))
      assert.equal(await hash(path.join(consumer, item.relative.slice("consumer/".length))), item.sha256);
  }
  for (const item of lock.tarballs) assert.equal(await hash(item.path), item.sha256);
  for (const item of lock.installed) {
    assert.equal(await hash(item.path), item.sha256);
    if (item.installedPath) assert.equal(await hash(item.installedPath), item.sha256);
  }
  assert.equal(await hash(lock.compiler.path), lock.compiler.sha256);
  assert.equal(await hash(lock.compiler.installedPath), lock.compiler.sha256);
  for (const item of buildProof.transforms) assert.equal(await hash(item.path), item.sha256);
  for (const item of buildProof.assets) assert.equal(await hash(item.path), item.sha256);
  return rows;
};
const scan = async directory => {
  const rows = [];
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) rows.push({ path: path.relative(directory, file).replaceAll(path.sep, "/"),
        sha256: await hash(file), bytes: (await stat(file)).size });
    }
  };
  await walk(directory);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
};
const run = async (mode, output) => {
  const argv = ["comparison/build.mjs", mode, output];
  const started = process.hrtime.bigint();
  const child = spawn(process.execPath, argv, { cwd: consumer, detached: true,
    stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let stopReason = null, spawnError = null, signal = null;
  const stop = reason => {
    stopReason ??= reason;
    if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {}
  };
  const interrupt = () => stop("signal");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => stop("deadline-90s"), 90_000);
  const exit = await new Promise(resolve => {
    child.once("error", error => { spawnError = String(error); resolve(127); });
    child.once("close", (code, exitSignal) => { signal = exitSignal; resolve(code ?? 1); });
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  clearTimeout(timer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `${phase}-${mode}.stdout.log`), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proof, `${phase}-${mode}.stderr.log`), Buffer.concat(stderr), { flag: "wx" });
  return { mode, command: process.execPath, argv, exit, signal, stopReason, spawnError,
    elapsedMs: phase === "measure" ? elapsedMs : null };
};

const receiptPath = path.join(proof, phase === "proof" ? "pair-proof.json" : "pair-one-shot.json");
const receipt = { phase, status: "STARTED", buildProofSha256: sha(buildProofBytes),
  inputBefore: [], inputAfter: [], builds: [], transforms: {}, assets: {}, metadata: {}, errors: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
try {
  if (phase === "measure") {
    const priorBytes = await readFile(path.join(proof, "pair-proof.json"));
    const prior = JSON.parse(priorBytes);
    assert.equal(prior.status, "PASS_UNTIMED_PAIR_PROOF");
    const authorization = JSON.parse(await readFile(path.join(proof, "run-authorization.json"), "utf8"));
    assert.equal(authorization.status, "APPROVED_FOR_ONE_BUILD_PAIR");
    assert.equal(authorization.buildProofSha256, sha(buildProofBytes));
    assert.equal(authorization.pairProofSha256, sha(priorBytes));
    receipt.authorization = authorization;
  }
  receipt.inputBefore = await verify();
  for (const mode of ["native", "react"]) {
    const output = path.join(proof, phase === "proof" ? "comparison-proof" : "comparison-one-shot");
    const built = await run(mode, output);
    receipt.builds.push(built);
    assert.equal(built.exit, 0, `${mode} build failed`);
    assert.equal(built.stopReason, null, `${mode} build interrupted`);
    receipt.transforms[mode] = await scan(path.join(output, "transforms", mode));
    receipt.assets[mode] = await scan(path.join(output, "dist", mode));
    const transformed = await readFile(path.join(output, "transforms", mode, `${mode}.tsx.js`), "utf8");
    const metadata = JSON.parse(await readFile(path.join(output, `build-${mode}-transforms.json`), "utf8"));
    receipt.metadata[mode] = { transformed: metadata.transformed, compilerEvents: metadata.compilerEvents };
    if (mode === "native") {
      assert.match(transformed, /__nativeDefineComponent/);
      assert.match(transformed, /compiledNativeComponentPlan|compiledAsyncTaskPlan/);
      assert.match(transformed, /registerCompiledSemanticPlan/);
      assert.match(transformed, /"module_revision":\s*"native-v1-/);
      assert.match(transformed, /__nativeNumericPrograms/);
      assert.match(transformed, /__nativeBindStatePropAt/);
      assert.deepEqual(metadata.compilerEvents, []);
    } else {
      assert.match(transformed, /react\/compiler-runtime/);
      assert.match(transformed, /_c\(\d+\)/);
      assert.ok(metadata.compilerEvents.some(item => item.kind === "CompileSuccess" && item.fnName === "Counter"));
    }
  }
  receipt.inputAfter = await verify();
  if (phase === "measure") {
    const prior = JSON.parse(await readFile(path.join(proof, "pair-proof.json"), "utf8"));
    assert.deepEqual(receipt.transforms, prior.transforms);
    assert.deepEqual(receipt.assets, prior.assets);
    assert.deepEqual(receipt.metadata, prior.metadata);
    receipt.comparison = { nativeMs: receipt.builds[0].elapsedMs,
      reactMs: receipt.builds[1].elapsedMs, order: "native-react",
      meaning: "one fixed fresh-process Vite spawn-to-exit pair; cache state may be warm" };
  }
  receipt.status = phase === "proof" ? "PASS_UNTIMED_PAIR_PROOF" : "PASS_ONE_BUILD_PAIR";
} catch (error) {
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
if (receipt.status === "FAIL_OR_INCOMPLETE") {
  console.error(receipt.errors.join("\n"));
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receiptPath }));
