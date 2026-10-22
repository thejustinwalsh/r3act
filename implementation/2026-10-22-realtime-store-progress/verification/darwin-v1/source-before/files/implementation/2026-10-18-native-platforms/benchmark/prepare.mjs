import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const stage = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(stage, "../../..");
const args = process.argv.slice(2);
assert.deepEqual(args.slice(0, 1), ["--proof-dir"]);
assert.ok(args[1] && args.length === 2, "usage: node prepare.mjs --proof-dir ABSOLUTE_NEW_PROOF_DIR");
const proofDir = path.resolve(args[1]);
assert.equal(path.dirname(proofDir), stage);
assert.match(path.basename(proofDir), /^proof-[a-z0-9-]+$/);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const relative = (filename) => path.relative(root, filename).split(path.sep).join("/");
const record = { schemaVersion: 1, status: "STARTED", node: process.version, nodeExecutable: process.execPath,
  steps: [], errors: [] };
await mkdir(proofDir);
await writeFile(path.join(proofDir, "setup-attempt.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
const run = async (command, commandArgs, cwd, label, timeout = 180_000) => {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", timeout,
    killSignal: "SIGKILL",
    env: { ...process.env, npm_config_ignore_scripts: "true" } });
  await writeFile(path.join(proofDir, `${label}.stdout.log`), result.stdout ?? "", { flag: "wx" });
  await writeFile(path.join(proofDir, `${label}.stderr.log`), result.stderr ?? "", { flag: "wx" });
  record.steps.push({ label, command: path.basename(command), args: commandArgs, exit: result.status,
    signal: result.signal, error: result.error?.message ?? null });
  assert.equal(result.status, 0, `${label}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
};
const collectFiles = async (directory) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collectFiles(filename));
    else result.push(filename);
  }
  return result.sort();
};
const walkAst = (node, visit) => {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments", "leadingComments", "trailingComments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((item) => walkAst(item, visit));
    else if (value && typeof value === "object") walkAst(value, visit);
  }
};
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find((item) => item.type === "ObjectProperty" &&
    (item.key.name ?? item.key.value) === name)?.value : null;
const literal = (node) => node?.type === "StringLiteral" ? node.value : undefined;
const sourceInventory = async (reportPath) => {
  const sourcePaths = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
    "tsconfig.r3act-packages.json", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock",
    ...["native_arm.tsx", "react_arm.tsx", "build-arm.mjs", "prepare.mjs", "run-once.mjs", "README.md"]
      .map((name) => relative(path.join(stage, name))), relative(reportPath)]);
  const visitSources = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (["target", "node_modules", ".cache", "dist"].includes(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visitSources(filename);
      else if (/\.(?:ts|tsx|mjs|rs|json|toml)$/.test(entry.name)) sourcePaths.add(relative(filename));
    }
  };
  for (const section of ["src", "compiler", "packages", "scripts"]) {
    await visitSources(path.join(root, section));
  }
  const sources = [];
  for (const file of [...sourcePaths].sort()) {
    sources.push({ path: file, sha256: await hashFile(path.join(root, file)) });
  }
  return sources;
};
try {
  const reportPath = path.join(root, ".cache/r3act-package-build/report.json");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const packageNames = ["core", "vite", "host-dom", "host-three", "react-bridge"];
  const tarballs = [];
  for (const name of packageNames) {
    const entry = report.packages[`@r3act/${name}`];
    assert.ok(entry?.file && entry.sha256);
    const filename = path.join(root, entry.file);
    assert.equal(await hashFile(filename), entry.sha256, `${name} report hash`);
    tarballs.push({ name, file: relative(filename), sha256: entry.sha256 });
  }
  const stagedBinary = path.join(root, ".cache/r3act-package-build/vite", report.compilerBinary.path);
  const stagedManifest = path.join(root, ".cache/r3act-package-build/vite/dist/compiler/bin/manifest.json");
  const sourceLock = { schemaVersion: 1, status: "FROZEN_BEFORE_SETUP",
    sources: await sourceInventory(reportPath), tarballs,
    compiler: { path: relative(stagedBinary), sha256: await hashFile(stagedBinary),
      manifestPath: relative(stagedManifest), manifestSha256: await hashFile(stagedManifest) } };
  assert.equal(sourceLock.compiler.sha256, report.compilerBinary.sha256);
  await writeFile(path.join(proofDir, "source-lock.json"), JSON.stringify(sourceLock, null, 2) + "\n",
    { flag: "wx" });
  const consumer = path.join(proofDir, "consumer");
  await mkdir(consumer);
  const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const rootLock = await readFile(path.join(root, "pnpm-lock.yaml"), "utf8");
  for (const name of ["react", "react-dom", "three", "vite", "@vitejs/plugin-react", "babel-plugin-react-compiler"]) {
    const version = rootManifest.dependencies?.[name] ?? rootManifest.devDependencies?.[name];
    assert.ok(typeof version === "string" && !/^[~^*]/.test(version) && rootLock.includes(version),
      `${name} must use a root lock-backed exact version`);
  }
  const installed = Object.fromEntries(tarballs.map(({ name, file }) =>
    [`@r3act/${name}`, `file:${path.join(root, file)}`]));
  const dependencies = { ...installed };
  for (const name of ["react", "react-dom", "three"]) dependencies[name] = rootManifest.dependencies[name];
  for (const name of ["vite", "@vitejs/plugin-react", "babel-plugin-react-compiler"]) {
    dependencies[name] = rootManifest.devDependencies[name];
  }
  assert.ok(Object.values(dependencies).every((value) => typeof value === "string" && value.length));
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({
    name: "r3act-compiler-artifact-build-pair", private: true, type: "module", dependencies,
  }, null, 2) + "\n", { flag: "wx" });
  await writeFile(path.join(consumer, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(installed["@r3act/core"])}\n`, { flag: "wx" });
  for (const name of ["native_arm.tsx", "react_arm.tsx", "build-arm.mjs"]) {
    await copyFile(path.join(stage, name), path.join(consumer, name));
  }
  const pnpm = process.env.R3ACT_PNPM_COMMAND || "pnpm";
  await run(pnpm, ["install", "--lockfile-only", "--ignore-scripts"], consumer, "install-lock");
  await run(pnpm, ["install", "--frozen-lockfile", "--ignore-scripts"], consumer, "install-frozen");
  const installedBinary = path.join(consumer, "node_modules/@r3act/vite", report.compilerBinary.path);
  assert.equal(await hashFile(installedBinary), report.compilerBinary.sha256, "installed compiler SHA-256");
  assert.ok(((await stat(installedBinary)).mode & 0o111) !== 0, "installed compiler is not executable");
  const info = JSON.parse((await run(installedBinary, ["--compiler-info"], consumer, "compiler-info")).trim());
  assert.deepEqual(info, report.compilerBinary.compilerInfo);
  const manifestPath = path.join(consumer, "node_modules/@r3act/vite/dist/compiler/bin/manifest.json");
  const compilerManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(compilerManifest.schemaVersion, 1);
  assert.equal(compilerManifest.protocolVersion, 1);
  assert.ok(compilerManifest.artifacts.some((item) => item.sha256 === report.compilerBinary.sha256 &&
    item.target === info.target && item.platform === info.platform && item.arch === info.arch));
  const blocker = path.join(consumer, "blocked-tools");
  await mkdir(blocker);
  const cargoName = process.platform === "win32" ? "cargo.cmd" : "cargo";
  await writeFile(path.join(blocker, cargoName), process.platform === "win32"
    ? "@echo off\r\necho Cargo must not run for this installed build pair 1>&2\r\nexit /b 97\r\n"
    : "#!/bin/sh\necho 'Cargo must not run for this installed build pair' >&2\nexit 97\n",
    { mode: 0o755, flag: "wx" });
  process.env.PATH = `${blocker}${path.delimiter}${process.env.PATH ?? ""}`;
  for (const arm of ["native", "react"]) {
    await run(process.execPath, [path.join(consumer, "build-arm.mjs"), arm,
      path.join(proofDir, "review", arm)], consumer, `review-${arm}`);
  }
  const nativeCode = await readFile(path.join(proofDir, "review/native/post-transform.js"), "utf8");
  const reactCode = await readFile(path.join(proofDir, "review/react/post-transform.js"), "utf8");
  const nativeAst = parse(nativeCode, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] });
  const nativeCalls = [];
  walkAst(nativeAst.program, (node) => {
    if (node.type === "CallExpression" && node.callee.type === "Identifier") nativeCalls.push(node);
  });
  const callsNamed = (name) => nativeCalls.filter((node) => node.callee.name === name);
  const plans = callsNamed("__registerNativeSemanticPlan");
  const invalidations = callsNamed("__invalidateNativeSemanticPlan");
  const definitions = callsNamed("__nativeDefineComponent");
  const stateCalls = callsNamed("__nativeUseStateAt");
  assert.equal(plans.length, 1, "native transform must register one semantic plan");
  assert.equal(invalidations.length, 1, "native transform must emit one HMR invalidation");
  const semantic = plans[0].arguments[0];
  const sourceFile = literal(property(semantic, "source_file"));
  const moduleRevision = literal(property(semantic, "module_revision"));
  const owners = property(semantic, "owners")?.elements ?? [];
  const semanticSources = property(semantic, "sources")?.elements ?? [];
  const counterDefinition = definitions.find((node) => node.arguments[1]?.type === "Identifier" &&
    node.arguments[1].name === "Counter");
  const counterId = literal(counterDefinition?.arguments[0]);
  const stateSite = literal(stateCalls[0]?.arguments[0]);
  const assertions = {
    nativeLoweredStateSite: stateCalls.length === 1 && stateSite?.startsWith(`${counterId}#state:`) === true,
    nativeDefinedComponent: !!counterId && counterId.startsWith(`${sourceFile}#component:Counter`) &&
      owners.some((owner) => literal(property(owner, "site_id")) === counterId),
    nativeRegisteredSemanticPlan: !!sourceFile && /^native-v1-[a-f0-9]+$/.test(moduleRevision ?? ""),
    nativeMatchingModuleRevision: literal(invalidations[0].arguments[0]) === sourceFile &&
      literal(invalidations[0].arguments[1]) === moduleRevision,
    nativeTrackedStateSource: semanticSources.some((source) =>
      literal(property(source, "site_id")) === stateSite &&
      literal(property(source, "owner_site_id")) === counterId &&
      literal(property(source, "kind")) === "state"),
    reactCompilerRuntime: reactCode.includes("react/compiler-runtime"),
    reactMemoCache: /\b_c\s*\(/.test(reactCode) && /\$\[\d+\]/.test(reactCode),
  };
  assert.ok(Object.values(assertions).every(Boolean), JSON.stringify(assertions));
  const sources = sourceLock.sources;
  for (const item of sourceLock.sources) {
    assert.equal(await hashFile(path.join(root, item.path)), item.sha256,
      `source drift after untimed builds: ${item.path}`);
  }
  for (const item of sourceLock.tarballs) {
    assert.equal(await hashFile(path.join(root, item.file)), item.sha256,
      `tarball drift after untimed builds: ${item.file}`);
  }
  assert.equal(await hashFile(path.join(root, sourceLock.compiler.path)), sourceLock.compiler.sha256,
    "staged compiler drift after untimed builds");
  assert.equal(await hashFile(path.join(root, sourceLock.compiler.manifestPath)),
    sourceLock.compiler.manifestSha256, "staged compiler manifest drift after untimed builds");
  assert.equal(await hashFile(installedBinary), report.compilerBinary.sha256,
    "installed compiler drift after untimed builds");
  assert.equal(await hashFile(manifestPath), sourceLock.compiler.manifestSha256,
    "installed compiler manifest drift after untimed builds");
  const reviewAssets = [];
  for (const arm of ["native", "react"]) {
    for (const file of await collectFiles(path.join(proofDir, "review", arm))) {
      reviewAssets.push({ path: path.relative(proofDir, file).split(path.sep).join("/"),
        bytes: (await stat(file)).size, sha256: await hashFile(file) });
    }
  }
  const consumerInputs = [];
  for (const name of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "native_arm.tsx",
    "react_arm.tsx", "build-arm.mjs", `blocked-tools/${cargoName}`]) {
    const file = path.join(consumer, name);
    consumerInputs.push({ path: `consumer/${name}`, sha256: await hashFile(file) });
  }
  const proof = { schemaVersion: 1, status: "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW",
    meaning: "Untimed fresh installation and Vite builds; timed phase awaits hash-bound primary approval",
    node: process.version, nodeExecutable: process.execPath,
    nodeExecutableSha256: await hashFile(process.execPath), packageReportSha256: await hashFile(reportPath),
    sourceLockSha256: await hashFile(path.join(proofDir, "source-lock.json")),
    tarballs, compiler: { path: path.relative(proofDir, installedBinary).split(path.sep).join("/"),
      sha256: await hashFile(installedBinary), info, manifestSha256: await hashFile(manifestPath) },
    sources, consumerInputs, reviewAssets, assertions };
  await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
  record.status = "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW";
} catch (error) {
  record.status = "INCOMPLETE";
  record.errors.push(String(error?.stack ?? error));
  throw error;
} finally {
  await writeFile(path.join(proofDir, "setup-attempt.json"), JSON.stringify(record, null, 2) + "\n");
}
