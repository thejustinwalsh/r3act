import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir") && args.includes("--phase"),
  "usage: node run-pair.mjs --proof-dir DIR --phase proof|measure");
const proof = path.resolve(root, option("--proof-dir"));
const phase = option("--phase");
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.ok(["proof", "measure"].includes(phase));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildBytes = await readFile(path.join(proof, "build-proof.json"));
const build = JSON.parse(buildBytes);
assert.equal(build.status, "PASS_INSTALLED_BUILD_PROOF");
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const consumer = build.consumer;
const verify = async () => {
  const rows = [];
  for (const row of lock.source) {
    const current = await hash(row.path), archived = await hash(row.archive);
    rows.push({ path: row.relative, expected: row.sha256, current, archived });
    assert.equal(current, row.sha256); assert.equal(archived, row.sha256);
    if (row.relative.startsWith("examples/arrow-components/")) {
      const copied = path.join(consumer, "example", row.relative.slice("examples/arrow-components/".length));
      assert.equal(await hash(copied), row.sha256);
    }
    if (row.relative.startsWith("implementation/2026-10-19-arrow-components/comparison/")) {
      const name = path.basename(row.relative);
      const copied = name === "build.mjs" ? path.join(consumer, "build-capture.mjs")
        : name === "index.html" ? null : path.join(consumer, `comparison-${name.slice(0, -4)}`, name);
      if (copied) assert.equal(await hash(copied), row.sha256);
    }
  }
  for (const row of lock.packageSources) {
    assert.equal(await hash(row.path), row.sha256);
    assert.equal(await hash(row.archive), row.sha256);
  }
  for (const row of lock.consumerCopies) assert.equal(await hash(row.path), row.sha256);
  for (const row of [...lock.tarballs, ...lock.installed, lock.compiler]) {
    assert.equal(await hash(row.path), row.sha256);
    assert.equal(await hash(row.archive), row.sha256);
  }
  for (const row of [...build.transforms, ...build.assets]) assert.equal(await hash(row.path), row.sha256);
  if (phase === "measure") {
    const prior = JSON.parse(await readFile(path.join(proof, "pair-proof.json"), "utf8"));
    for (const mode of ["native", "react"]) {
      for (const row of prior.transforms[mode]) assert.equal(await hash(path.join(proof,
        "comparison-proof", "transforms", mode, row.path)), row.sha256);
      for (const row of prior.assets[mode]) assert.equal(await hash(path.join(proof,
        "comparison-proof", "dist", mode, row.path)), row.sha256);
    }
  }
  return rows;
};
const walk = async directory => {
  const rows = [];
  const visit = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) rows.push({ path: path.relative(directory, file).replaceAll(path.sep, "/"),
        sha256: await hash(file), bytes: (await stat(file)).size });
    }
  };
  await visit(directory);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
};
const generated = (source, marker) => {
  const position = source.indexOf(marker);
  assert.ok(position >= 0, `missing ${marker}`);
  const start = source.indexOf("{", position + marker.length);
  assert.ok(start >= 0);
  let depth = 0, quoted = false, escape = false;
  for (let index = start; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (escape) escape = false;
      else if (character === "\\") escape = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) return JSON.parse(source.slice(start, index + 1));
  }
  assert.fail(`unterminated ${marker}`);
};
const run = async (mode, output) => {
  const argv = ["build-capture.mjs", mode, output];
  const start = process.hrtime.bigint();
  const child = spawn(process.execPath, argv, { cwd: consumer, detached: true,
    stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let reason = null, spawnError = null, signal = null;
  const stop = why => { reason ??= why; if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {} };
  const interrupt = () => stop("signal");
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => stop("deadline-90s"), 90_000);
  const exit = await new Promise(resolve => {
    child.once("error", error => { spawnError = String(error); resolve(127); });
    child.once("close", (code, exitSignal) => { signal = exitSignal; resolve(code ?? 1); });
  });
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  clearTimeout(timer); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `${phase}-${mode}.stdout.log`), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proof, `${phase}-${mode}.stderr.log`), Buffer.concat(stderr), { flag: "wx" });
  return { mode, command: process.execPath, argv, exit, signal, reason, spawnError,
    elapsedMs: phase === "measure" && exit === 0 && reason === null && spawnError === null ? elapsed : null };
};

const receiptPath = path.join(proof, phase === "proof" ? "pair-proof.json" : "pair-one-shot.json");
const receipt = { status: "STARTED", phase, buildProofSha256: sha(buildBytes), before: [], after: [],
  builds: [], transforms: {}, assets: {}, metadata: {}, errors: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
try {
  if (phase === "measure") {
    const pairBytes = await readFile(path.join(proof, "pair-proof.json"));
    const pair = JSON.parse(pairBytes);
    assert.equal(pair.status, "PASS_UNTIMED_PAIR_PROOF");
    const behaviorBytes = await readFile(path.join(proof, "browser-behavior.json"));
    const behavior = JSON.parse(behaviorBytes);
    assert.equal(behavior.status, "PASS_BROWSER_BEHAVIOR");
    assert.equal(behavior.stopReason, null);
    assert.deepEqual(behavior.errors, []);
    const authorization = JSON.parse(await readFile(path.join(proof, "run-authorization.json"), "utf8"));
    assert.deepEqual(authorization, { status: "APPROVED_FOR_ONE_BUILD_PAIR",
      buildProofSha256: sha(buildBytes), pairProofSha256: sha(pairBytes),
      browserBehaviorSha256: sha(behaviorBytes) });
    receipt.authorization = authorization;
  }
  receipt.before = await verify();
  for (const mode of ["native", "react"]) {
    const output = path.join(proof, phase === "proof" ? "comparison-proof" : "comparison-one-shot");
    const built = await run(mode, output);
    receipt.builds.push(built);
    assert.equal(built.exit, 0, `${mode} build failed; see preserved logs`);
    assert.equal(built.reason, null);
    receipt.transforms[mode] = await walk(path.join(output, "transforms", mode));
    receipt.assets[mode] = await walk(path.join(output, "dist", mode));
    const source = await readFile(path.join(output, "transforms", mode, `${mode}.tsx.js`), "utf8");
    const metadata = JSON.parse(await readFile(path.join(output, `build-${mode}-transforms.json`), "utf8"));
    receipt.metadata[mode] = { transformed: metadata.transformed, compilerEvents: metadata.compilerEvents };
    if (mode === "native") {
      const semantic = generated(source, "__registerNativeSemanticPlan(");
      const plan = generated(source, "export const compiledNativeComponentPlan =");
      assert.equal(semantic.schema_version, 1);
      assert.equal(plan.schema_version, 2);
      assert.equal(semantic.source_file, "native.tsx");
      assert.equal(plan.source_file, "native.tsx");
      assert.equal(plan.module_revision, semantic.module_revision);
      assert.deepEqual(plan.semantic_plan, semantic);
      assert.ok(semantic.owners.some(owner => owner.site_id === "native.tsx#component:Counter"));
      assert.ok(semantic.sources.some(item => item.kind === "state" && item.provenance === "tracked"));
      assert.match(source, /const Counter = __nativeDefineComponent\("native\.tsx#component:Counter"/);
      assert.match(source, /__nativeUseStateAt/);
      assert.doesNotMatch(source, /react\/compiler-runtime/);
      assert.deepEqual(metadata.compilerEvents, []);
      assert.ok(source.includes(`__invalidateNativeSemanticPlan("native.tsx", "${semantic.module_revision}")`));
      receipt.metadata.native.semantic = { revision: semantic.module_revision,
        owners: semantic.owners.length, sources: semantic.sources.length,
        sinks: semantic.sinks.length, operations: semantic.operations.length,
        coverage: semantic.graph.coverage };
    } else {
      assert.match(source, /react\/compiler-runtime/);
      assert.match(source, /_c\(\d+\)/);
      assert.ok(metadata.compilerEvents.some(event => event.kind === "CompileSuccess" && event.fnName === "Counter"));
    }
  }
  receipt.after = await verify();
  if (phase === "measure") {
    const prior = JSON.parse(await readFile(path.join(proof, "pair-proof.json"), "utf8"));
    assert.deepEqual(receipt.transforms, prior.transforms);
    assert.deepEqual(receipt.assets, prior.assets);
    assert.deepEqual(receipt.metadata, prior.metadata);
    receipt.comparison = { nativeMs: receipt.builds[0].elapsedMs,
      reactMs: receipt.builds[1].elapsedMs, order: "native-react",
      meaning: "one fresh-process Vite spawn-to-exit build pair; caches may be warm; no runtime speed claim" };
  }
  receipt.status = phase === "proof" ? "PASS_UNTIMED_PAIR_PROOF" : "PASS_ONE_BUILD_PAIR";
} catch (error) {
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
if (receipt.status === "FAIL_OR_INCOMPLETE") {
  console.error(receipt.errors.join("\n")); process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receipt: receiptPath }));
