import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir"), "usage: node run-build-pair.mjs --proof-dir DIR");
const proof = path.resolve(root, option("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildProofBytes = await readFile(path.join(proof, "build-proof.json"));
const buildProof = JSON.parse(buildProofBytes);
assert.equal(buildProof.status, "PASS_INSTALLED_BUILD_PROOF");
const consumer = buildProof.consumer;
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-numeric-owner-"));
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const verify = async () => {
  const rows = [];
  assert.equal(lock.packageReport.sourcePath,
    path.join(root, ".cache/r3act-package-build/report.json"));
  assert.equal(lock.packageReport.path, path.join(proof, "inputs", "package-report.json"));
  const reportBytes = await readFile(lock.packageReport.path);
  assert.equal(sha(reportBytes), lock.packageReport.sha256);
  assert.equal(await hash(lock.packageReport.sourcePath), lock.packageReport.sha256);
  assert.equal(await hash(lock.baseline.sourcePath), lock.baseline.sha256);
  assert.equal(await hash(lock.baseline.path), lock.baseline.sha256);
  assert.equal(await hash(path.join(unit, "baseline/provenance.json")), lock.baseline.manifestSha256);
  assert.equal(await hash(lock.baseline.manifestPath), lock.baseline.manifestSha256);
  assert.equal(await hash(lock.baseline.reportSourcePath), lock.baseline.reportSha256);
  assert.equal(await hash(lock.baseline.reportPath), lock.baseline.reportSha256);
  const report = JSON.parse(reportBytes);
  for (const [relative, expected] of Object.entries(report.sourceHashes ?? {}))
    assert.equal(await hash(path.join(root, relative)), expected,
      `changed package source: ${relative}`);
  for (const item of lock.source) {
    const current = await hash(path.join(unit, item.relative));
    const archived = await hash(path.join(proof, "inputs", "source", item.relative));
    assert.equal(current, item.sha256);
    assert.equal(archived, item.sha256);
    if (item.relative.startsWith("consumer/") && item.relative !== "consumer/package.json") assert.equal(
      await hash(path.join(consumer, item.relative.slice("consumer/".length))), item.sha256);
    rows.push({ path: item.relative, sha256: current });
  }
  for (const item of lock.externalSource) {
    assert.equal(await hash(path.join(root, item.relative)), item.sha256);
    assert.equal(await hash(item.path), item.sha256);
    rows.push({ path: item.relative, sha256: item.sha256 });
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
const run = async mode => {
  const output = path.join(proof, "comparison-proof");
  const argv = ["comparison/build.mjs", mode, output];
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
  let closeTimer;
  const exit = await new Promise(resolve => {
    let settled = false;
    const finish = code => { if (!settled) { settled = true; resolve(code); } };
    child.once("error", error => { spawnError = String(error); finish(127); });
    child.once("close", (code, exitSignal) => { signal = exitSignal; finish(code ?? 1); });
    closeTimer = setTimeout(() => { stop("post-kill-close-timeout"); finish(124); }, 95_000);
  });
  clearTimeout(timer);
  clearTimeout(closeTimer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `comparison-${mode}.stdout.log`), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proof, `comparison-${mode}.stderr.log`), Buffer.concat(stderr), { flag: "wx" });
  return { mode, command: process.execPath, argv, exit, signal, stopReason, spawnError };
};

const receiptPath = path.join(proof, "pair-proof.json");
const receipt = { status: "STARTED", buildProofSha256: sha(buildProofBytes),
  inputBefore: [], inputAfter: [], builds: [], transforms: {}, assets: {}, metadata: {}, errors: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
try {
  receipt.inputBefore = await verify();
  for (const mode of ["native", "react"]) {
    const built = await run(mode);
    receipt.builds.push(built);
    assert.equal(built.exit, 0, `${mode} build failed`);
    assert.equal(built.stopReason, null, `${mode} build interrupted`);
    receipt.transforms[mode] = await scan(path.join(proof, "comparison-proof", "transforms", mode));
    receipt.assets[mode] = await scan(path.join(proof, "comparison-proof", "dist", mode));
    const metadata = JSON.parse(await readFile(path.join(proof, "comparison-proof",
      `build-${mode}-transforms.json`), "utf8"));
    receipt.metadata[mode] = metadata;
    if (mode === "native") {
      const main = await readFile(path.join(proof, "comparison-proof", "transforms", mode,
        "main.tsx.js"), "utf8");
      const scene = await readFile(path.join(proof, "comparison-proof", "transforms", mode,
        "scene.tsx.js"), "utf8");
      const ast = parse(main, { sourceType: "module", plugins: ["typescript", "jsx"] });
      const registrations = new Map();
      const field = (node, name) => node?.properties?.find(item =>
        (item.key?.name ?? item.key?.value) === name)?.value ?? null;
      const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
      const value = node => {
        if (node?.type === "ArrayExpression") return node.elements.map(value);
        if (node?.type === "ObjectExpression") return Object.fromEntries(node.properties.map(item =>
          [item.key.name ?? item.key.value, value(item.value)]));
        return literal(node);
      };
      let scenePlan = null;
      const visit = node => {
        if (!node || typeof node !== "object") return;
        if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
          scenePlan = node.arguments[0];
        if (node.type === "CallExpression" && /^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) {
          const name = node.arguments[0]?.value?.split("#component:")[1];
          if (name) registrations.set(name, node.arguments[2]);
        }
        for (const [key, child] of Object.entries(node)) {
          if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
          if (Array.isArray(child)) child.forEach(visit);
          else if (child && typeof child === "object") visit(child);
        }
      };
      visit(ast);
      const unsafe = registrations.get("OpaqueSibling");
      assert.ok(unsafe, "installed named opaque owner missing");
      assert.equal(field(unsafe, "propOnlySites")?.elements.length, 0);
      assert.equal(field(unsafe, "ownerUpdateProgram"), null);
      for (const name of ["HotCounter", "PureNamed", "PureArrow"]) {
        const metadata = registrations.get(name);
        assert.ok(metadata, `${name} installed owner missing`);
        assert.ok(field(metadata, "propOnlySites")?.elements.length > 0);
        assert.ok(field(metadata, "ownerUpdateProgram"));
      }
      assert.match(main, /__nativeNumericPrograms/);
      scenePlan = null;
      visit(parse(scene, { sourceType: "module", plugins: ["typescript", "jsx"] }));
      assert.equal(literal(field(scenePlan, "source_file")), "scene.tsx");
      const sceneRevision = literal(field(scenePlan, "module_revision"));
      assert.match(sceneRevision ?? "", /^native-v1-[a-f0-9]+$/);
      const sceneId = "scene.tsx#component:SceneLeaf";
      const sceneMetadata = registrations.get("SceneLeaf");
      assert.ok(sceneMetadata, "installed SceneLeaf owner missing");
      assert.equal(field(sceneMetadata, "closedResourceHostProgram"), null);
      const sceneProgram = field(sceneMetadata, "closedStoreHostProgram");
      assert.ok(sceneProgram, "SceneLeaf schema-5 resource input program missing");
      assert.equal(literal(field(sceneProgram, "schemaVersion")), 5);
      assert.equal(literal(field(sceneProgram, "componentProgramId")), sceneId);
      assert.equal(literal(field(sceneProgram, "moduleRevision")), sceneRevision);
      assert.deepEqual(value(field(sceneProgram, "inputs")), [{
        storeUseSiteId: `${sceneId}#store:0`, storeProp: "resource", paths: [["sample", "x"]],
      }]);
      assert.deepEqual(value(field(sceneProgram, "host")), {
        tag: "group", key: "scene-leaf", props: [], children: [{ kind: "host", host: {
          tag: "mesh", key: "scene-mesh", children: [], props: [["position", {
            kind: "tuple", items: [{ kind: "input", index: 0 },
              { kind: "literal", value: 0 }, { kind: "literal", value: 0 }],
          }]],
        } }],
      });
    } else {
      const transformed = await readFile(path.join(proof, "comparison-proof", "transforms", mode,
        "comparison", "react", "react.tsx.js"), "utf8");
      assert.match(transformed, /react\/compiler-runtime/);
      for (const name of ["App", "HotCounter"]) {
        assert.match(transformed, new RegExp(`function ${name}\\([^)]*\\) \\{\\s*const \\$ = _c\\(\\d+\\);`),
          `${name} lacks React Compiler memo cache in its own function body`);
      }
      assert.match(transformed, /from ["']react\/jsx-runtime["']/);
      assert.doesNotMatch(transformed, /["']@r3act\/core\/jsx-runtime["']/);
      for (const name of ["App", "HotCounter"]) assert.ok(
        metadata.compilerEvents.some(item => item.kind === "CompileSuccess" && item.fnName === name),
        `React Compiler did not report CompileSuccess for ${name}`);
    }
    assert.ok(receipt.assets[mode].some(item => item.path === "index.html"));
    assert.ok(receipt.assets[mode].some(item => item.path.endsWith(".js")));
  }
  receipt.inputAfter = await verify();
  receipt.status = "PASS_UNTIMED_PRODUCTION_PAIR";
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
