import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const at = process.argv.indexOf("--proof-dir");
assert.ok(at >= 0 && process.argv[at + 1], "usage: node build.mjs --proof-dir NEW_PATH");
const proof = path.resolve(root, process.argv[at + 1]);
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const walk = async directory => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`Unexpected source entry: ${file}`);
  }
  return result.sort();
};
const run = async (label, command, argv, cwd, deadlineMs = 180_000) => {
  const stdout = [], stderr = [];
  const child = spawn(command, argv, { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let reason = null, spawnError = null;
  const stop = why => { reason ??= why; if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {} };
  const interrupt = () => stop("signal");
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => stop("deadline"), deadlineMs);
  const exit = await new Promise(resolve => {
    child.once("error", error => { spawnError = String(error); resolve(127); });
    child.once("close", code => resolve(code ?? 1));
  });
  clearTimeout(timer); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `${label}.stdout.log`), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proof, `${label}.stderr.log`), Buffer.concat(stderr), { flag: "wx" });
  const receipt = { command, argv, exit, reason, spawnError };
  await writeFile(path.join(proof, `${label}.json`), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  assert.equal(exit, 0, `${label} failed; see preserved logs`);
  assert.equal(reason, null, `${label} was interrupted`);
};
const capture = async (source, destination) => {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  assert.equal(await hash(source), await hash(destination));
  return { path: source, archive: destination, sha256: await hash(source), bytes: (await stat(source)).size };
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

await mkdir(proof);
const consumer = await realpath(await mkdtemp(path.join(tmpdir(), "r3act-arrow-components-")));
const record = { status: "STARTED", consumer, source: [], packageSources: [], consumerCopies: [], tarballs: [], installed: [], compiler: null,
  transforms: [], assets: [], node: process.version, platform: `${process.platform}-${process.arch}` };
try {
  const reportPath = path.join(root, ".cache/r3act-package-build/report.json");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  record.source.push({ relative: ".cache/r3act-package-build/report.json",
    ...await capture(reportPath, path.join(proof, "inputs", "package-report.json")) });
  assert.equal(Object.keys(report.sourceHashes ?? {}).length, 48, "expected current 48-source package archive");
  for (const [relative, expected] of Object.entries(report.sourceHashes)) {
    const source = path.resolve(root, relative);
    assert.ok(source.startsWith(`${root}${path.sep}`));
    assert.equal(await hash(source), expected, `stale package source: ${relative}`);
    record.packageSources.push({ relative, ...await capture(source,
      path.join(proof, "inputs", "package-source", relative)) });
  }
  const tarballs = {};
  for (const name of ["core", "vite", "host-dom", "host-three", "react-bridge"]) {
    const pkg = `@r3act/${name}`;
    const source = path.join(root, report.packages[pkg].file);
    const expected = report.packages[pkg].sha256;
    assert.equal(await hash(source), expected);
    const row = await capture(source, path.join(proof, "inputs", "tarballs", `${name}.tgz`));
    tarballs[pkg] = `file:${row.archive}`;
    record.tarballs.push({ ...row, package: pkg });
  }
  const exampleRoot = path.join(root, "examples/arrow-components");
  const sources = [...await walk(exampleRoot), ...await walk(path.join(unit, "comparison")),
    ...["build.mjs", "verify-browser.mjs", "run-pair.mjs", "README.md"].map(name => path.join(unit, name))];
  for (const source of sources) {
    const relative = path.relative(root, source).replaceAll(path.sep, "/");
    record.source.push({ relative, ...await capture(source,
      path.join(proof, "inputs", "source", relative)) });
  }
  await cp(exampleRoot, path.join(consumer, "example"), { recursive: true, force: false });
  for (const source of await walk(exampleRoot)) {
    const copied = path.join(consumer, "example", path.relative(exampleRoot, source));
    assert.equal(await hash(copied), await hash(source));
    record.consumerCopies.push({ path: copied, sha256: await hash(copied) });
  }
  for (const mode of ["native", "react"]) {
    const directory = path.join(consumer, `comparison-${mode}`);
    await mkdir(directory);
    await copyFile(path.join(unit, "comparison", `${mode}.tsx`), path.join(directory, `${mode}.tsx`));
    const html = (await readFile(path.join(unit, "comparison/index.html"), "utf8")).replace("ENTRY", mode);
    await writeFile(path.join(directory, "index.html"), html);
    for (const name of [`${mode}.tsx`, "index.html"]) {
      const copied = path.join(directory, name);
      record.consumerCopies.push({ path: copied, sha256: await hash(copied) });
    }
  }
  await copyFile(path.join(unit, "comparison/build.mjs"), path.join(consumer, "build-capture.mjs"));
  record.consumerCopies.push({ path: path.join(consumer, "build-capture.mjs"),
    sha256: await hash(path.join(consumer, "build-capture.mjs")) });
  const manifest = { name: "r3act-arrow-components-consumer", private: true, type: "module",
    dependencies: { ...tarballs, react: "19.3.0", "react-dom": "19.3.0", three: "0.186.1",
      vite: "8.3.1", "@vitejs/plugin-react": "5.2.0", "babel-plugin-react-compiler": "1.0.0",
      "@typescript/native-preview": "7.0.0-dev.20260707.2", "@types/node": "24.19.2",
      "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/three": "0.186.0" } };
  await writeFile(path.join(consumer, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(consumer, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(tarballs["@r3act/core"])}\n`);
  await run("install", "pnpm", ["install", "--ignore-scripts",
    ...(process.env.R3ACT_PNPM_STORE ? ["--store-dir", process.env.R3ACT_PNPM_STORE] : [])], consumer);
  for (const name of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
    const source = path.join(consumer, name);
    record.installed.push({ name, ...await capture(source,
      path.join(proof, "inputs", "installed", "manifest", name)) });
  }
  for (const name of ["@r3act/core", "@r3act/vite", "@r3act/host-dom", "@r3act/host-three",
    "@r3act/react-bridge", "@vitejs/plugin-react", "react", "react-dom", "three"]) {
    const directory = await realpath(path.join(consumer, "node_modules", name));
    assert.ok(directory.startsWith(`${consumer}/node_modules/.pnpm/`));
    for (const source of await walk(directory)) {
      const relative = path.relative(directory, source);
      if (!/\.(?:js|mjs|cjs|ts|json)$/.test(source)) continue;
      record.installed.push({ name, relative, ...await capture(source,
        path.join(proof, "inputs", "installed", name, relative)) });
    }
  }
  const binary = path.join(consumer, "node_modules/@r3act/vite", report.compilerBinary.path);
  assert.equal(await hash(binary), report.compilerBinary.sha256);
  record.compiler = { target: report.compilerBinary.target,
    ...await capture(binary, path.join(proof, "inputs", "compiler", path.basename(binary))) };
  await writeFile(path.join(proof, "input-lock.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  await run("typecheck", path.join(consumer, "node_modules/.bin/tsgo"), ["-p", "example/tsconfig.json"], consumer);
  await run("build-example", process.execPath, ["build-capture.mjs", "example", proof], consumer);
  for (const file of await walk(path.join(proof, "transforms")))
    record.transforms.push({ path: file, sha256: await hash(file) });
  const transformMetadata = path.join(proof, "build-example-transforms.json");
  record.transforms.push({ path: transformMetadata, sha256: await hash(transformMetadata) });
  for (const file of await walk(path.join(proof, "dist")))
    record.assets.push({ path: file, sha256: await hash(file), bytes: (await stat(file)).size,
      urlPath: `/${path.relative(path.join(proof, "dist", "example"), file).replaceAll(path.sep, "/")}` });
  for (const [filename, components] of [["app.tsx.js", ["ArrowBadge", "ArrowRow", "ArrowResult", "ArrowApp"]],
    ["scene.tsx.js", ["ArrowMesh", "ArrowScene"]]]) {
    const transformed = await readFile(path.join(proof, "transforms", "example", filename), "utf8");
    assert.match(transformed, /__nativeDefineComponent/);
    const semantic = generated(transformed, "__registerNativeSemanticPlan(");
    const plan = generated(transformed, "export const compiledNativeComponentPlan =");
    assert.equal(semantic.source_file, filename.slice(0, -3));
    assert.equal(plan.source_file, semantic.source_file);
    assert.equal(plan.module_revision, semantic.module_revision);
    assert.deepEqual(plan.semantic_plan, semantic);
    assert.ok(semantic.owners.length > 0);
    for (const component of components) {
      assert.ok(transformed.includes(`const ${component} = __nativeDefineComponent("${semantic.source_file}#component:${component}"`),
        `missing arrow initializer wrapper for ${component}`);
      assert.ok(semantic.owners.some(owner => owner.site_id === `${semantic.source_file}#component:${component}`),
        `missing semantic owner for ${component}`);
    }
    assert.ok(transformed.includes(`__invalidateNativeSemanticPlan("${semantic.source_file}", "${semantic.module_revision}")`));
  }
  assert.ok(record.assets.some(item => item.urlPath === "/index.html"));
  for (const row of record.source) assert.equal(await hash(row.path), row.sha256);
  for (const row of record.packageSources) {
    assert.equal(await hash(row.path), row.sha256);
    assert.equal(await hash(row.archive), row.sha256);
  }
  for (const row of record.consumerCopies) assert.equal(await hash(row.path), row.sha256);
  for (const row of [...record.tarballs, ...record.installed, record.compiler]) {
    assert.equal(await hash(row.path), row.sha256);
    assert.equal(await hash(row.archive), row.sha256);
  }
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
