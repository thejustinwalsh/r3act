import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { nativeVerificationInputs, nativeVerificationContext,
  stageNativeVerificationSource } from "../../scripts/native_verification_inputs.mjs";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const flag = process.argv.indexOf("--proof-dir");
assert.ok(flag >= 0 && process.argv[flag + 1], "usage: node prepare.mjs --proof-dir NEW_DIR");
const proof = path.resolve(process.argv[flag + 1]);
assert.equal(path.dirname(proof), unit, "proof must be a new child of this unit");
assert.match(path.basename(proof), /^proof-v[1-9]\d*$/);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const files = async directory => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`Unexpected file type in selected graph: ${file}`);
  }
  return result.sort();
};
const archive = async (source, target) => {
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target, constants.COPYFILE_EXCL);
  assert.equal(await hash(target), await hash(source));
};
const run = async (name, command, argv, cwd, deadlineMs = 180_000) => {
  const stdout = [], stderr = [];
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const child = spawn(command, argv, { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let stop = null, spawnError = null;
  const kill = reason => {
    stop ??= reason;
    if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {}
  };
  const interrupt = () => kill("signal");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => kill("deadline"), deadlineMs);
  let hardTimer;
  const exit = await new Promise(resolve => {
    let settled = false;
    const finish = code => { if (!settled) { settled = true; resolve(code); } };
    child.once("error", error => { spawnError = String(error); finish(127); });
    child.once("close", code => finish(code ?? 1));
    hardTimer = setTimeout(() => { kill("post-kill-close-timeout"); finish(124); }, deadlineMs + 5_000);
  });
  clearTimeout(hardTimer);
  clearTimeout(timer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  const finishedAt = new Date().toISOString();
  const wallClockMs = performance.now() - start;
  const stdoutPath = path.join(proof, `${name}.stdout.log`);
  const stderrPath = path.join(proof, `${name}.stderr.log`);
  const stdoutBytes = Buffer.concat(stdout), stderrBytes = Buffer.concat(stderr);
  await writeFile(stdoutPath, stdoutBytes, { flag: "wx" });
  await writeFile(stderrPath, stderrBytes, { flag: "wx" });
  const result = { command, argv, cwd, startedAt, finishedAt, wallClockMs,
    exit, stop, spawnError, qualification: "descriptive build process only",
    stdout: { path: stdoutPath, sha256: sha(stdoutBytes), bytes: stdoutBytes.length },
    stderr: { path: stderrPath, sha256: sha(stderrBytes), bytes: stderrBytes.length } };
  await writeFile(path.join(proof, `${name}.json`), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  assert.equal(exit, 0, `${name} failed; raw logs preserved in ${proof}`);
  assert.equal(stop, null);
  return result;
};

await mkdir(proof);
const consumer = await realpath(await mkdtemp(path.join(tmpdir(), "r3act-process-lifecycle-")));
const record = { status: "STARTED", proof, consumer, node: process.version,
  platform: `${process.platform}-${process.arch}`, entries: { native: "native.html", react: "react.html" },
  inputs: [], tarballs: [], installed: [], packageReport: null, compiler: null,
  sourceSelection: null, sourceContext: null, stagedSource: null,
  reactAdaptation: null, browserDependencies: { files: [] },
  processes: {}, compilerEvents: {}, transformCaptures: {},
  transforms: { native: [], react: [] },
  assets: { native: [], react: [] }, assertions: {} };
try {
  record.sourceSelection = await nativeVerificationInputs(root);
  record.sourceContext = await nativeVerificationContext(root);
  record.stagedSource = await stageNativeVerificationSource(root,
    path.join(proof, "inputs", "native-source"));
  const reportSource = path.join(root, ".cache/r3act-package-build/report.json");
  const reportBytes = await readFile(reportSource);
  const report = JSON.parse(reportBytes);
  const reportArchive = path.join(proof, "inputs", "package-report.json");
  await mkdir(path.dirname(reportArchive), { recursive: true });
  await writeFile(reportArchive, reportBytes, { flag: "wx" });
  record.packageReport = { path: reportArchive, sourcePath: reportSource, sha256: sha(reportBytes) };
  assert.ok(report.sourceHashes && Object.keys(report.sourceHashes).length > 0,
    "Package report needs current source hashes");
  for (const [relative, expected] of Object.entries(report.sourceHashes))
    assert.equal(await hash(path.join(root, relative)), expected, `Stale package report: ${relative}`);

  const packageNames = ["core", "vite", "host-dom", "host-three", "react-bridge"];
  const tarballUrls = {};
  for (const name of packageNames) {
    const pkg = `@r3act/${name}`;
    const item = report.packages[pkg];
    assert.ok(item?.file && item.sha256, `Missing fresh tarball: ${pkg}`);
    const source = path.join(root, item.file);
    assert.equal(await hash(source), item.sha256);
    const target = path.join(proof, "inputs", "tarballs", `${name}.tgz`);
    await archive(source, target);
    tarballUrls[pkg] = `file:${target}`;
    record.tarballs.push({ package: pkg, path: source, archivePath: target,
      tarballPath: target, sha256: item.sha256 });
  }

  const authoredSources = [path.join(unit, "prepare.mjs"),
    ...(await readdir(unit, { withFileTypes: true }))
      .filter(item => item.isFile() && /\.(mjs|md)$/.test(item.name) && item.name !== "prepare.mjs")
      .map(item => path.join(unit, item.name)),
    ...await files(path.join(unit, "consumer"))];
  for (const source of authoredSources) {
    const relative = path.relative(unit, source).replaceAll(path.sep, "/");
    const target = path.join(proof, "inputs", "source", relative);
    await archive(source, target);
    record.inputs.push({ path: source, archivePath: target, relative, sha256: await hash(source) });
    if (relative.startsWith("consumer/")) {
      const installedTarget = path.join(consumer, relative.slice("consumer/".length));
      await archive(source, installedTarget);
    }
  }
  const externalSources = ["scripts/native_verification_inputs.mjs",
    "compiler/vite_native_module.ts", "compiler/vite_native_plugin.ts",
    "compiler/native_runtime_origin.ts", "compiler/oxc-spike/src/main.rs"];
  for (const relative of externalSources) {
    const source = path.join(root, relative);
    const target = path.join(proof, "inputs", "external-source", relative);
    await archive(source, target);
    record.inputs.push({ path: source, archivePath: target, relative, sha256: await hash(source) });
  }
  const vitexecRoot = await realpath(path.join(root, "node_modules/vitexec"));
  const playwrightRoot = await realpath(path.join(path.dirname(vitexecRoot), "playwright"));
  const playwrightCoreRoot = await realpath(path.join(path.dirname(playwrightRoot), "playwright-core"));
  const browserSources = [
    ["vitexec", vitexecRoot, "package.json"],
    ["vitexec", vitexecRoot, "dist/cli.js"],
    ["vitexec", vitexecRoot, "dist/browser.js"],
    ["vitexec", vitexecRoot, "dist/options.js"],
    ["playwright", playwrightRoot, "package.json"],
    ["playwright", playwrightRoot, "index.mjs"],
    ["playwright-core", playwrightCoreRoot, "package.json"],
    ["playwright-core", playwrightCoreRoot, "index.js"],
    ["playwright-core", playwrightCoreRoot, "lib/bootstrap.js"],
    ["playwright-core", playwrightCoreRoot, "lib/coreBundle.js"],
    ["playwright-core", playwrightCoreRoot, "lib/serverRegistry.js"],
    ["playwright-core", playwrightCoreRoot, "browsers.json"],
    ["playwright-core", playwrightCoreRoot, "types/protocol.d.ts"],
  ];
  for (const [name, packageRoot, packageFile] of browserSources) {
    const source = path.join(packageRoot, packageFile);
    const relative = `browser-dependencies/${name}/${packageFile}`;
    const target = path.join(proof, "inputs", relative);
    await archive(source, target);
    const item = { path: source, archivePath: target, relative, sha256: await hash(source) };
    record.inputs.push(item);
    record.browserDependencies.files.push({ ...item, package: name });
  }
  const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "index.mjs")).href);
  const browserExecutable = await realpath(chromium.executablePath());
  const browserExecutableStat = await stat(browserExecutable);
  assert.ok(browserExecutableStat.isFile(), "Playwright Chromium executable is missing");
  record.browserDependencies.executable = {
    path: browserExecutable,
    sha256: await hash(browserExecutable),
    bytes: browserExecutableStat.size,
    derivation: "chromium.executablePath() from the locked Playwright package",
  };
  const frozenArmNames = ["contract.ts", "native_arm.tsx", "react_arm.tsx"];
  const reactComment = "// @ts-expect-error ReactDOM runtime is installed without react-dom declarations in this project.\n";
  const reactPragma = "/** @jsxImportSource react */\n";
  const oldReactPath = path.join(root, "implementation/2026-10-18-authored-lifecycle/workload/react_arm.tsx");
  const newReactPath = path.join(unit, "consumer/react_arm.tsx");
  const oldReact = await readFile(oldReactPath, "utf8");
  assert.equal(oldReact.split(reactComment).length - 1, 2,
    "Frozen React source no longer has the two Deno-only declaration comments");
  const adaptedReact = `${reactPragma}${oldReact.replaceAll(reactComment, "")}`;
  assert.equal(await readFile(newReactPath, "utf8"), adaptedReact,
    "Installed React arm contains an unreviewed change beyond pragma/type comments");
  record.reactAdaptation = { frozenPath: oldReactPath, frozenSha256: sha(oldReact),
    consumerPath: newReactPath, consumerSha256: sha(adaptedReact),
    removedExactComment: reactComment.trimEnd(), removedCount: 2,
    prependedPragma: reactPragma.trimEnd() };
  for (const name of frozenArmNames) {
    const source = path.join(root, "implementation/2026-10-18-authored-lifecycle/workload", name);
    const target = path.join(proof, "inputs", "frozen-authored-lifecycle", name);
    await archive(source, target);
    const current = path.join(unit, "consumer", name);
    if (name !== "react_arm.tsx")
      assert.equal(await hash(current), await hash(source), `Changed frozen authored lifecycle body: ${name}`);
    record.inputs.push({ path: source, archivePath: target,
      relative: `frozen-authored-lifecycle/${name}`, sha256: await hash(source) });
  }

  const manifestFile = path.join(consumer, "package.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  for (const [name, url] of Object.entries(tarballUrls)) {
    if (name === "@r3act/vite") manifest.devDependencies[name] = url;
    else manifest.dependencies[name] = url;
  }
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(consumer, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(tarballUrls["@r3act/core"])}\n`);
  record.processes.install = await run("install", "pnpm", ["install", "--ignore-scripts"], consumer);
  for (const name of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
    const source = path.join(consumer, name);
    const target = path.join(proof, "inputs", "installed-manifest", name);
    await archive(source, target);
    record.installed.push({ name, path: source, archivePath: target, sha256: await hash(source) });
  }
  const selectedPackages = [...new Set([
    ...Object.keys(manifest.dependencies), ...Object.keys(manifest.devDependencies),
  ])].sort();
  for (const name of selectedPackages) {
    const installed = await realpath(path.join(consumer, "node_modules", name));
    assert.ok(installed.startsWith(path.join(consumer, "node_modules/.pnpm") + path.sep),
      `Package escaped isolated graph: ${name}`);
    for (const source of await files(installed)) {
      const relative = path.relative(installed, source).replaceAll(path.sep, "/");
      const target = path.join(proof, "inputs", "installed-graph", name, relative);
      await archive(source, target);
      record.installed.push({ name, relative, path: source, archivePath: target,
        sha256: await hash(source) });
    }
  }

  assert.equal(report.compilerBinary.target, `${process.platform}-${process.arch}`);
  const rustTarget = report.compilerBinary.rustTarget;
  assert.ok(typeof rustTarget === "string" && rustTarget.length > 0);
  assert.equal(report.compilerBinary.compilerInfo?.target, rustTarget);
  assert.equal(report.compilerBinary.compilerInfo?.platform, process.platform);
  assert.equal(report.compilerBinary.compilerInfo?.arch, process.arch);
  assert.ok(report.compilerBinary.path.split("/").includes(rustTarget));
  const binary = path.join(consumer, "node_modules/@r3act/vite", report.compilerBinary.path);
  assert.equal(await hash(binary), report.compilerBinary.sha256);
  const binaryCopy = path.join(proof, "inputs", "compiler", path.basename(binary));
  await archive(binary, binaryCopy);
  record.compiler = { path: binary, archivePath: binaryCopy,
    sha256: report.compilerBinary.sha256, target: report.compilerBinary.target,
    rustTarget, compilerInfo: report.compilerBinary.compilerInfo };

  const inputLockBytes = JSON.stringify({
    schemaVersion: "process-lifecycle-input-lock-v1", status: "PASS_INSTALLED_PREPARATION",
    proof, consumer, inputs: record.inputs, installed: record.installed,
    tarballs: record.tarballs, compiler: record.compiler, packageReport: record.packageReport,
    reactAdaptation: record.reactAdaptation,
    browserDependencies: record.browserDependencies,
    sourceSelection: record.sourceSelection, sourceContext: record.sourceContext,
    stagedSource: record.stagedSource,
  }, null, 2) + "\n";
  await writeFile(path.join(proof, "input-lock.json"), inputLockBytes, { flag: "wx" });
  record.inputLockSha256 = sha(inputLockBytes);

  record.processes.typecheck = await run("typecheck", path.join(consumer, "node_modules/.bin/tsgo"),
    ["-p", "tsconfig.json"], consumer);
  for (const mode of ["native", "react"]) {
    record.processes[`build-${mode}`] = await run(`build-${mode}`, process.execPath,
      ["build.mjs", mode, proof], consumer);
    const capturePath = path.join(proof, `build-${mode}-transforms.json`);
    const capture = JSON.parse(await readFile(capturePath, "utf8"));
    assert.equal(capture.mode, mode);
    record.transformCaptures[mode] = { path: capturePath, sha256: await hash(capturePath),
      bytes: (await stat(capturePath)).size };
    record.compilerEvents[mode] = capture.compilerEvents;
    if (mode === "react") record.reactRowMemoSlots = capture.reactRowMemoSlots;
    for (const file of await files(path.join(proof, "transforms", mode)))
      record.transforms[mode].push({ path: file, sha256: await hash(file), bytes: (await stat(file)).size });
    for (const file of await files(path.join(proof, "dist", mode))) {
      const relative = path.relative(path.join(proof, "dist", mode), file).replaceAll(path.sep, "/");
      record.assets[mode].push({ path: file, urlPath: `/${mode}/${relative}`,
        sha256: await hash(file), bytes: (await stat(file)).size });
    }
  }

  const nativeTransformed = record.transforms.native.find(item => item.path.endsWith("/native_arm.tsx.js"));
  const reactTransformed = record.transforms.react.find(item => item.path.endsWith("/react_arm.tsx.js"));
  const nativeCode = nativeTransformed ? await readFile(nativeTransformed.path, "utf8") : "";
  const reactCode = reactTransformed ? await readFile(reactTransformed.path, "utf8") : "";
  const nativeList = JSON.parse(await readFile(path.join(proof, "build-native-transforms.json"), "utf8")).transformed;
  const reactList = JSON.parse(await readFile(path.join(proof, "build-react-transforms.json"), "utf8")).transformed;
  record.assertions = {
    frozenNativeAndContract: (await Promise.all(["contract.ts", "native_arm.tsx"].map(async name =>
      await hash(path.join(unit, "consumer", name)) === await hash(path.join(root,
        "implementation/2026-10-18-authored-lifecycle/workload", name))))).every(Boolean),
    exactReactCommentAdaptation: await readFile(newReactPath, "utf8") === adaptedReact &&
      await hash(oldReactPath) === record.reactAdaptation.frozenSha256,
    separateNativeGraph: nativeList.includes("native_arm.tsx") && nativeList.includes("native.ts") &&
      !nativeList.includes("react_arm.tsx") && !nativeList.includes("react.ts"),
    separateReactGraph: reactList.includes("react_arm.tsx") && reactList.includes("react.ts") &&
      !reactList.includes("native_arm.tsx") && !reactList.includes("native.ts"),
    nativeCompiler: /__nativeDefineComponent/.test(nativeCode) &&
      /registerCompiledSemanticPlan/.test(nativeCode) && /__nativeUseAt\s*\(/.test(nativeCode),
    reactCompilerSuccess: record.compilerEvents.react.some(event =>
      event.kind === "CompileSuccess" && event.fnName === "ReactRow"),
    reactRowMemo: Array.isArray(record.reactRowMemoSlots) &&
      record.reactRowMemoSlots.some(slots => Number.isInteger(slots) && slots > 0) &&
      /react\/compiler-runtime/.test(reactCode),
    reactJsxRuntime: /react\/jsx-runtime/.test(reactCode),
    entryAssets: ["native", "react"].every(mode => record.assets[mode].some(item =>
      item.path.endsWith(`/${record.entries[mode]}`))),
    transformAssets: ["native", "react"].every(mode =>
      record.transforms[mode].length > 0 && record.assets[mode].length > 1),
  };
  assert.ok(Object.values(record.assertions).every(Boolean),
    `Build assertions failed: ${JSON.stringify(record.assertions)}`);

  for (const row of [...record.inputs, ...record.installed, ...record.tarballs]) {
    assert.equal(await hash(row.path), row.sha256, `Input changed: ${row.path}`);
    assert.equal(await hash(row.archivePath), row.sha256, `Archive changed: ${row.archivePath}`);
  }
  assert.equal(await hash(record.browserDependencies.executable.path),
    record.browserDependencies.executable.sha256, "Browser executable changed during preparation");
  assert.equal(await hash(record.compiler.path), record.compiler.sha256);
  assert.equal(await hash(record.compiler.archivePath), record.compiler.sha256);
  assert.equal(await hash(reportSource), record.packageReport.sha256);
  assert.equal(await hash(reportArchive), record.packageReport.sha256);
  for (const item of record.stagedSource.files) {
    assert.equal(await hash(path.join(root, item.path)), item.sha256);
    assert.equal(await hash(path.join(proof, "inputs", "native-source", item.path)), item.sha256);
  }
  for (const [relative, expected] of Object.entries(report.sourceHashes))
    assert.equal(await hash(path.join(root, relative)), expected, `Changed package source: ${relative}`);
  for (const mode of ["native", "react"])
    for (const item of [...record.transforms[mode], ...record.assets[mode]])
      assert.equal(await hash(item.path), item.sha256);
  for (const item of Object.values(record.transformCaptures))
    assert.equal(await hash(item.path), item.sha256);
  for (const operation of Object.values(record.processes))
    for (const stream of [operation.stdout, operation.stderr])
      assert.equal(await hash(stream.path), stream.sha256);
  record.status = "PASS_INSTALLED_BUILD_PROOF";
} catch (error) {
  record.status = "FAIL_OR_INCOMPLETE";
  record.error = error instanceof Error ? error.stack ?? String(error) : String(error);
} finally {
  await writeFile(path.join(proof, "build-proof.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
if (record.status !== "PASS_INSTALLED_BUILD_PROOF") {
  console.error(record.error);
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: record.status, consumer, proof }));
