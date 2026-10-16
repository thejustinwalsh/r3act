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
if (Number(process.versions.node.split(".")[0]) !== 24) {
  throw new Error("Eligibility gate requires pinned Node 24");
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
  if (exit.code !== 0) throw new Error(`${filename}: Rust request failed ${exit.code}/${exit.signal}: ${stderr}`);
  const lines = output.split("\n");
  if (lines.length !== 1) throw new Error(`${filename}: expected one Rust response`);
  const response = JSON.parse(lines[0]);
  if (response.id !== filename || response.error || !response.plan || !response.component_edits) {
    throw new Error(`${filename}: invalid Rust response ${response.error ?? "missing plan/edits"}`);
  }
  return response;
}
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
  const row = component(nativePlan, "NativeRow");
  const board = component(nativePlan, "NativeCollectionBoard");
  const genericRow = component(genericPlan, "GenericRow");
  const genericBoard = component(genericPlan, "NativeGenericBoard");
  const collectionSites = board.collection_sites ?? [];
  report.proof = {
    native: {
      emittedSha256: sha(Buffer.from(nativeCode)),
      sourceFile: nativePlan.source_file,
      rowSite: row.component_site_id,
      rowStateSites: row.state_sites?.map((site) => site.site_id) ?? [],
      rowEffectSites: row.effect_sites?.map((site) => site.site_id) ?? [],
      boardSite: board.component_site_id,
      collectionSites,
      emittedContainsSites: [row.component_site_id, board.component_site_id,
        ...collectionSites.map((site) => site.site_id)].every((site) => nativeCode.includes(site)),
      compilerDeltaEligible: collectionSites.length === 1 &&
        collectionSites[0].requires_owner_render === false,
    },
    generic: {
      emittedSha256: sha(Buffer.from(genericCode)),
      rowSite: genericRow.component_site_id,
      rowStateSites: genericRow.state_sites?.map((site) => site.site_id) ?? [],
      rowEffectSites: genericRow.effect_sites?.map((site) => site.site_id) ?? [],
      boardSite: genericBoard.component_site_id,
      boardStateSites: genericBoard.state_sites?.map((site) => site.site_id) ?? [],
      collectionSites: genericBoard.collection_sites ?? [],
      emittedContainsSites: [genericRow.component_site_id, genericBoard.component_site_id]
        .every((site) => genericCode.includes(site)),
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
      report.proof.generic.rowStateSites.length < 1 ||
      report.proof.generic.rowEffectSites.length < 1 ||
      report.proof.generic.boardStateSites.length < 1 ||
      report.proof.generic.collectionSites.length !== 0 ||
      !report.proof.generic.emittedContainsSites ||
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
  report.status = "BUILD_PROOF_PASS_RUNTIME_DELTA_UNVERIFIED";
} catch (error) {
  report.errors.push(String(error));
} finally {
  try { await verifyInputs("after"); }
  catch (error) { report.errors.push(String(error)); report.status = "FAIL"; }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
if (report.status !== "BUILD_PROOF_PASS_RUNTIME_DELTA_UNVERIFIED") process.exitCode = 1;
