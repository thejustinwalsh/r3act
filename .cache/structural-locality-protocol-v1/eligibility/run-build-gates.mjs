import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const lockPath = path.join(stage, "input-lock.json");
const reportPath = path.join(stage, "build-gate-report.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const lock = JSON.parse(await readFile(lockPath, "utf8"));
const report = {
  schemaVersion: "structural-eligibility-build-gate-v1",
  status: "FAIL",
  sourceLockSha256: sha(await readFile(lockPath)),
  inputs: [],
  commands: [],
  proof: {},
  errors: [],
};
if (process.version !== "v24.18.0") {
  throw new Error(`Eligibility gate requires pinned Node v24.18.0; got ${process.version}`);
}
async function exists(file) {
  try { await stat(file); return true; } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
for (const file of [reportPath, path.join(stage, "cargo-target"), path.join(stage, "proof"),
  path.join(stage, "dist-positive"), path.join(stage, "dist-negative")]) {
  if (await exists(file)) throw new Error(`Refusing to overwrite prior eligibility attempt: ${file}`);
}
for (const name of await readdir(stage)) {
  if (/^(?:cargo-build|positive-build|negative-build)\.(?:stdout|stderr)\.log$/.test(name) ||
      /^rust-.*\.(?:stdout\.jsonl|stderr\.log)$/.test(name)) {
    throw new Error(`Refusing to overwrite prior eligibility log: ${name}`);
  }
}

async function verifyInputs(label) {
  for (const entry of lock.inputs) {
    const actual = sha(await readFile(path.join(root, entry.path)));
    report.inputs.push({ phase: label, path: entry.path, expected: entry.sha256, actual });
    if (actual !== entry.sha256) throw new Error(`${label}: changed input ${entry.path}`);
  }
}

async function run(label, executable, args, extraEnv = {}) {
  const stdout = [];
  const stderr = [];
  const child = spawn(executable, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const out = Buffer.concat(stdout).toString("utf8");
  const err = Buffer.concat(stderr).toString("utf8");
  await writeFile(path.join(stage, `${label}.stdout.log`), out, { flag: "wx" });
  await writeFile(path.join(stage, `${label}.stderr.log`), err, { flag: "wx" });
  report.commands.push({ label, executable, args, exit,
    stdoutSha256: sha(Buffer.from(out)), stderrSha256: sha(Buffer.from(err)) });
  return { ...exit, stdout: out, stderr: err };
}

async function requestRustPlan(binary, filename) {
  const source = await readFile(path.join(stage, filename), "utf8");
  const request = JSON.stringify({
    id: filename,
    path: `.cache/structural-locality-protocol-v1/eligibility/${filename}`,
    source,
    helper_module: "",
    component_module: source,
  }) + "\n";
  const child = spawn(binary, ["--serve-native"], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
  const chunks = [];
  const errors = [];
  child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
  child.stdin.end(request);
  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const output = Buffer.concat(chunks).toString("utf8").trim();
  const stderr = Buffer.concat(errors).toString("utf8");
  await writeFile(path.join(stage, `rust-${filename}.stdout.jsonl`), output + "\n", { flag: "wx" });
  await writeFile(path.join(stage, `rust-${filename}.stderr.log`), stderr, { flag: "wx" });
  report.rustRequests ??= [];
  report.rustRequests.push({ filename, exit, stdoutSha256: sha(Buffer.from(output + "\n")),
    stderrSha256: sha(Buffer.from(stderr)) });
  if (exit.code !== 0) throw new Error(`${filename}: Rust request failed ${exit.code}/${exit.signal}: ${stderr}`);
  const lines = output.split("\n");
  if (lines.length !== 1) throw new Error(`${filename}: expected one Rust response`);
  const response = JSON.parse(lines[0]);
  if (response.id !== filename || response.error || !response.plan || !response.component_edits) {
    throw new Error(`${filename}: invalid Rust response ${response.error ?? "missing plan/edits"}`);
  }
  report.rustRequests.at(-1).planSha256 = sha(Buffer.from(JSON.stringify(response.plan)));
  return response;
}
const expectedPath = (filename) => `.cache/structural-locality-protocol-v1/eligibility/${filename}`;
const sitePresent = (code, site) => typeof site === "string" && site.length > 0 &&
  (code.includes(site) || code.includes(JSON.stringify(site)));
const validatedSites = (component, kind) => {
  const sites = component[kind]?.map((site) => site.site_id) ?? [];
  if (sites.some((site) => typeof site !== "string" || site.length === 0)) {
    throw new Error(`invalid ${kind} identities in ${component.name}`);
  }
  return sites;
};
const component = (plan, name) => {
  const found = plan.components?.find((item) => item.name === name);
  if (!found) throw new Error(`missing compiled component ${name}`);
  return found;
};
const memoIn = (code, name) => {
  const start = code.indexOf(`function ${name}(`);
  if (start < 0) return false;
  const next = code.indexOf("\nfunction ", start + 1);
  return /\b_c\(\d+\)/.test(code.slice(start, next < 0 ? undefined : next));
};

try {
  await verifyInputs("before");
  const cargoTarget = path.join(stage, "cargo-target");
  const cargo = await run("cargo-build", "cargo", [
    "build", "--frozen", "--manifest-path", path.join(root, "compiler/oxc-spike/Cargo.toml"),
    "--bin", "ui-graph-compiler-spike",
  ], { CARGO_TARGET_DIR: cargoTarget, CARGO_HOME: path.join(root, ".cache/cargo"), CARGO_NET_OFFLINE: "true" });
  if (cargo.code !== 0) throw new Error("fresh-target Rust/OXC compiler build failed");
  const compilerBinary = path.join(cargoTarget, "debug/ui-graph-compiler-spike");
  report.compiler = {
    sourceRoot: root,
    compilerRoot: root,
    targetDir: cargoTarget,
    cargoHome: path.join(root, ".cache/cargo"),
    cargoNetOffline: true,
    binary: compilerBinary,
    binarySha256: sha(await readFile(compilerBinary)),
    cargoLockSha256: sha(await readFile(path.join(root, "compiler/oxc-spike/Cargo.lock"))),
  };

  const vite = path.join(root, "node_modules/vite/bin/vite.js");
  const config = path.join(stage, "vite.config.ts");
  const positive = await run("positive-build", process.execPath,
    [vite, "build", "--config", config],
    { STRUCTURAL_ELIGIBILITY_CASE: "positive" });
  if (positive.code !== 0) throw new Error("positive Vite build failed");

  const nativeCode = await readFile(path.join(stage, "proof/native_collection.tsx.emitted.txt"), "utf8");
  const genericCode = await readFile(path.join(stage, "proof/native_generic.tsx.emitted.txt"), "utf8");
  const reactCode = await readFile(path.join(stage, "proof/react_array.tsx.emitted.txt"), "utf8");
  const nativePlan = (await requestRustPlan(compilerBinary, "native_collection.tsx")).plan;
  const genericPlan = (await requestRustPlan(compilerBinary, "native_generic.tsx")).plan;
  for (const [plan, filename] of [[nativePlan, "native_collection.tsx"],
    [genericPlan, "native_generic.tsx"]]) {
    if (plan.schema_version !== 2 || plan.source_file !== expectedPath(filename)) {
      throw new Error(`${filename}: Rust schema/source identity mismatch`);
    }
  }
  const row = component(nativePlan, "NativeRow");
  const board = component(nativePlan, "NativeCollectionBoard");
  const genericRow = component(genericPlan, "GenericRow");
  const genericBoard = component(genericPlan, "NativeGenericBoard");
  const collectionSites = board.collection_sites ?? [];
  const nativeStateSites = validatedSites(row, "state_sites");
  const nativeEffectSites = validatedSites(row, "effect_sites");
  const genericStateSites = validatedSites(genericRow, "state_sites");
  const genericEffectSites = validatedSites(genericRow, "effect_sites");
  const genericBoardStateSites = validatedSites(genericBoard, "state_sites");
  report.proof = {
    native: {
      emittedSha256: sha(Buffer.from(nativeCode)),
      sourceFile: nativePlan.source_file,
      rowSite: row.component_site_id,
      rowStateSites: nativeStateSites,
      rowEffectSites: nativeEffectSites,
      boardSite: board.component_site_id,
      collectionSites,
      emittedContainsSites: [row.component_site_id, board.component_site_id,
        ...nativeStateSites, ...nativeEffectSites, ...collectionSites.map((site) => site.site_id)]
        .every((site) => sitePresent(nativeCode, site)),
      nativeJsxLowered: nativeCode.includes("__nativeJsx.jsx"),
      compilerDeltaEligible: collectionSites.length === 1 &&
        collectionSites[0].requires_owner_render === false,
    },
    generic: {
      emittedSha256: sha(Buffer.from(genericCode)),
      rowSite: genericRow.component_site_id,
      rowStateSites: genericStateSites,
      rowEffectSites: genericEffectSites,
      boardSite: genericBoard.component_site_id,
      boardStateSites: genericBoardStateSites,
      collectionSites: genericBoard.collection_sites ?? [],
      emittedContainsSites: [genericRow.component_site_id, genericBoard.component_site_id,
        ...genericStateSites, ...genericEffectSites, ...genericBoardStateSites]
        .every((site) => sitePresent(genericCode, site)),
      nativeJsxLowered: genericCode.includes("__nativeJsx.jsx"),
    },
    react: {
      emittedSha256: sha(Buffer.from(reactCode)),
      rowMemoCache: memoIn(reactCode, "ReactRow"),
      boardMemoCache: memoIn(reactCode, "ReactArrayBoard"),
    },
  };
  if (report.proof.native.rowStateSites.length < 1 ||
      report.proof.native.rowEffectSites.length < 1 ||
      !report.proof.native.compilerDeltaEligible ||
      !report.proof.native.emittedContainsSites ||
      !report.proof.native.nativeJsxLowered ||
      report.proof.generic.rowStateSites.length < 1 ||
      report.proof.generic.rowEffectSites.length < 1 ||
      report.proof.generic.boardStateSites.length < 1 ||
      report.proof.generic.collectionSites.length !== 0 ||
      !report.proof.generic.emittedContainsSites ||
      !report.proof.generic.nativeJsxLowered ||
      !report.proof.react.rowMemoCache || !report.proof.react.boardMemoCache) {
    throw new Error("authored state/effect/collection/generic/React Compiler proof failed");
  }

  const negative = await run("negative-build", process.execPath,
    [vite, "build", "--config", config],
    { STRUCTURAL_ELIGIBILITY_CASE: "negative" });
  report.proof.negative = {
    nonzeroExit: negative.code !== 0,
    explicitIndexDiagnostic: (negative.stdout + negative.stderr).includes(
      "native collection `.map` requires one inline, synchronous, one-parameter arrow callback returning JSX; index parameters and thisArg are unsupported"
    ),
  };
  if (!report.proof.negative.nonzeroExit || !report.proof.negative.explicitIndexDiagnostic) {
    throw new Error("unsupported index callback did not produce expected compiler diagnostic");
  }

  const dist = path.join(stage, "dist-positive");
  async function listFiles(dir) {
    const result = [];
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) result.push(...await listFiles(file));
      else if (item.isFile()) result.push(file);
    }
    return result.sort();
  }
  report.localBuildFiles = await Promise.all((await listFiles(dist)).map(async (file) => ({
    path: path.relative(stage, file), sha256: sha(await readFile(file)),
  })));
  const jsFiles = (await listFiles(dist)).filter((file) => file.endsWith(".js"));
  const bundleText = (await Promise.all(jsFiles.map((file) => readFile(file, "utf8")))).join("\n");
  const mapFiles = (await listFiles(dist)).filter((file) => file.endsWith(".map"));
  const mapSources = (await Promise.all(mapFiles.map(async (file) =>
    JSON.parse(await readFile(file, "utf8")).sources ?? []))).flat();
  report.proof.localBundle = {
    nativeComponentNames: ["NativeRow", "NativeCollectionBoard", "GenericRow", "NativeGenericBoard"]
      .every((name) => bundleText.includes(name)),
    reactComponentNames: ["ReactRow", "ReactArrayBoard"].every((name) => bundleText.includes(name)),
    nativeSiteIds: [row.component_site_id, board.component_site_id,
      ...nativeStateSites, ...nativeEffectSites, ...collectionSites.map((site) => site.site_id)]
      .every((site) => sitePresent(bundleText, site)),
    reactMemoCache: bundleText.includes("_c("),
    nativeJsxRuntimeSource: mapSources.some((source) => source.includes("jsx_binding_runtime")),
    reactCompilerRuntimeSource: mapSources.some((source) => source.includes("compiler-runtime")),
    entryRegistry: bundleText.includes("__structuralEligibility"),
    mapFiles: mapFiles.length,
  };
  if (Object.values(report.proof.localBundle).some((value) => value === false) ||
      report.proof.localBundle.mapFiles === 0 ||
      !report.localBuildFiles.some((file) => file.path.endsWith("positive.html"))) {
    throw new Error("local bundle lacks compiler/native JSX/source-map provenance");
  }
  report.status = "BUILD_PROOF_PASS_RUNTIME_DELTA_UNVERIFIED";
} catch (error) {
  report.errors.push(String(error));
} finally {
  try { await verifyInputs("after"); }
  catch (error) { report.errors.push(String(error)); report.status = "FAIL"; }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
if (report.status !== "BUILD_PROOF_PASS_RUNTIME_DELTA_UNVERIFIED") process.exitCode = 1;
