import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const flag = (name) => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir") && args.includes("--phase"),
  "usage: node run-build-pair.mjs --proof-dir PROOF --phase proof|measure");
const proof = path.resolve(root, flag("--proof-dir"));
const phase = flag("--phase");
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.ok(["proof", "measure"].includes(phase));
assert.equal(process.version, "v24.18.0");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const buildProofBytes = await readFile(path.join(proof, "build-proof.json"));
const initial = JSON.parse(buildProofBytes);
assert.equal(initial.status, "PASS_SCENE_BUILD_PROOF");
const consumer = initial.consumer;
assert.ok(consumer.startsWith("/private/tmp/") || consumer.startsWith("/tmp/"));
const source = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const verifyInputs = async () => {
  const rows = [];
  for (const item of source.source) {
    const current = await hashFile(path.join(root, item.path));
    const archived = item.path.startsWith("implementation/2026-10-19-installed-scene/proof-")
      ? current : await hashFile(path.join(proof, "inputs/source", item.path));
    rows.push({ path: item.path, expected: item.sha256, current, archived });
    assert.equal(current, item.sha256);
    assert.equal(archived, item.sha256);
  }
  for (const item of source.tarballs) assert.equal(await hashFile(path.join(root, item.path)), item.sha256);
  assert.equal(await hashFile(path.join(root, source.compiler.path)), source.compiler.sha256);
  assert.equal(await hashFile(source.compiler.consumerPath), source.compiler.sha256);
  for (const item of source.consumerCopies) assert.equal(await hashFile(item.path), item.sha256);
  for (const item of source.installedGraph) for (const file of item.files) {
    assert.equal(await hashFile(path.join(root, item.root, file.path)), file.sha256);
    assert.equal(await hashFile(path.join(item.consumerRoot, file.path)), file.sha256);
  }
  for (const item of initial.transforms) assert.equal(await hashFile(path.join(root, item.path)), item.sha256);
  for (const item of initial.assets) assert.equal(await hashFile(path.join(root, item.path)), item.sha256);
  return rows;
};
const run = async (name, out) => {
  const start = process.hrtime.bigint();
  const child = spawn(process.execPath, ["consumer-build.mjs", name, out],
    { cwd: consumer, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let spawnError = null, stopReason = null;
  const stop = reason => { stopReason ??= reason; if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} } };
  const interrupt = () => stop("signal");
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => stop("deadline-90s"), 90_000);
  let signal = null;
  const exit = await new Promise(resolve => { child.once("error", error => { spawnError = String(error); resolve(127); });
    child.once("close", (code, exitSignal) => { signal = exitSignal; resolve(code ?? 1); }); });
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  clearTimeout(timer); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `${phase}-${name}.stdout.log`), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proof, `${phase}-${name}.stderr.log`), Buffer.concat(stderr), { flag: "wx" });
  return { name, command: process.execPath, argv: ["consumer-build.mjs", name, out],
    exit, signal, elapsedMs, spawnError, stopReason };
};
const compareFiles = async (directory) => {
  const rows = [];
  const scan = async dir => { for (const entry of await readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else if (entry.isFile()) rows.push({ path: path.relative(directory, filename).replaceAll(path.sep, "/"),
      sha256: await hashFile(filename), bytes: (await stat(filename)).size });
  } };
  await scan(directory);
  return rows.sort((a,b) => a.path.localeCompare(b.path));
};
const receipt = { phase, status: "STARTED", buildProofSha256: sha(buildProofBytes), inputBefore: [],
  inputAfter: [], builds: [], transforms: {}, assets: {}, errors: [] };
const receiptPath = path.join(proof, phase === "proof" ? "pair-proof.json" : "pair-one-shot.json");
let failed = false;
try { await stat(receiptPath); throw new Error(`refusing repeated ${phase}`); }
catch (error) { if (error?.code !== "ENOENT") throw error; }
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
try {
  if (phase === "measure") {
    const pairProofBytes = await readFile(path.join(proof, "pair-proof.json"));
    const pairProof = JSON.parse(pairProofBytes);
    assert.equal(pairProof.status, "PASS_UNTIMED_PAIR_PROOF");
    const authorization = JSON.parse(await readFile(path.join(proof, "run-authorization.json"), "utf8"));
    assert.equal(authorization.status, "APPROVED_FOR_ONE_BUILD_PAIR");
    assert.equal(authorization.buildProofSha256, sha(buildProofBytes));
    assert.equal(authorization.pairProofSha256, sha(pairProofBytes));
    receipt.authorization = authorization;
  }
  receipt.inputBefore = await verifyInputs();
  for (const name of ["native", "react"]) {
    const out = phase === "proof" ? path.join(proof, "comparison-proof") : path.join(proof, "comparison-one-shot");
    const built = await run(name, out);
    receipt.builds.push(built);
    assert.equal(built.exit, 0, `${phase} ${name} build failed`);
    assert.equal(built.stopReason, null, `${phase} ${name} build interrupted`);
    receipt.transforms[name] = await compareFiles(path.join(out, "transforms", name));
    receipt.assets[name] = await compareFiles(path.join(out, "dist", name));
    const transformed = await readFile(path.join(out, "transforms", name, `${name}.tsx.js`), "utf8");
    if (name === "native") assert.match(transformed, /__nativeDefineComponent|__nativeUseAt|__nativeUseStoreAt/);
    else { assert.match(transformed, /react\/compiler-runtime/); assert.match(transformed, /_c\(\d+\)/); }
    const captures = JSON.parse(await readFile(path.join(out, `build-${name}-transforms.json`), "utf8"));
    assert.deepEqual(captures.wrapperInputs.map(item => item.phase).sort(), ["post", "pre"],
      "installed Radix wrapper pre/post capture missing");
    assert.ok(captures.wrapperInputs.every(item => item.id.includes(consumer)));
    assert.equal(await hashFile(captures.wrapperInputs[0].path), await hashFile(captures.wrapperInputs[1].path));
    if (name === "react") assert.ok(captures.compilerEvents.some(item => item.kind === "CompileSuccess"),
      "ordinary React consumer lacked React Compiler CompileSuccess");
    assert.ok(captures.compilerEvents.every(item => !item.filename?.includes("react_radix_dialog_adapter")),
      "installed Radix wrapper received a React Compiler event");
  }
  receipt.inputAfter = await verifyInputs();
  if (phase === "measure") {
    const prior = JSON.parse(await readFile(path.join(proof, "pair-proof.json"), "utf8"));
    assert.deepEqual(receipt.transforms, prior.transforms, "timed transforms differ from reviewed proof");
    receipt.comparison = { nativeMs: receipt.builds[0].elapsedMs,
      reactMs: receipt.builds[1].elapsedMs, order: "native-react",
      meaning: "fresh-process Vite spawn-to-exit, one fixed pair, cache state may be warm" };
  }
  receipt.status = phase === "proof" ? "PASS_UNTIMED_PAIR_PROOF" : "PASS_ONE_BUILD_PAIR";
} catch (error) { failed = true; receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally { await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n"); }
if (failed) { console.error(receipt.errors.join("\n")); process.exitCode = 1; }
else console.log(JSON.stringify({ status: receipt.status, receiptPath }));
