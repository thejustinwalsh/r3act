import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

const roots = ["src", "compiler", "packages", "scripts"];
const excluded = new Set([".git", ".cache", "node_modules", "target", "dist", "evidence", "verification",
  "benchmark", "proof", "images", "image", "generated", "baseline"]);
const excludedPattern = /^(?:proof|evidence|images?|generated|baseline)(?:-|$)/;
const requiredFiles = ["README.md", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "deno.json",
  "deno.browser.json", "deno.native.json", "deno.lock", "LICENSE",
  "implementation/2026-10-16-publication/verification/deno-runtime.lock"];
const optionalFiles = [".github/workflows/native-package-portability.yml",
  ...["native-platforms", "resource-values", "store-values", "store-subtrees", "store-projections",
    "joint-async-inputs", "component-forwarding", "authored-lifecycle"].flatMap((name) =>
    ["design.md", "source-review.md"].map((file) => `implementation/2026-10-18-${name}/${file}`)),
  "implementation/2026-10-18-authored-lifecycle/workload/contract.ts",
  ...["native_arm.tsx", "react_arm.tsx", "entry.ts", "index.html", "vite.config.ts",
    "build-gate.mjs", "run-pairs.mjs", "README.md"].map((file) =>
    `implementation/2026-10-18-authored-lifecycle/workload/${file}`)];
const selectedDirectories = ["examples/installed-scene", "examples/forked-transitions",
  "examples/custom-host", "examples/arrow-components"];
const requiredDirectories = ["implementation/2026-10-18-native-platforms/benchmark",
  "implementation/2026-10-18-native-platforms/linux"];
const contextFiles = ["AGENTS.md", "final-master-plan.md", "implementation-checkpoint.md",
  "HANDOFF-PROMPT.txt", "RESEARCH-GUIDE.md", "native-package-integration.md",
  "docs/react-bridge-reference.md", "docs/radix-dialog-reference.md",
  "docs/native-authoring-reference.md", "docs/three-host-reference.md"];

export const isCurrentImplementationUnitName = (name) => {
  const datedUnit = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(name);
  if (!datedUnit) return false;
  const stamp = `${datedUnit[1]}-${datedUnit[2]}-${datedUnit[3]}`;
  const date = new Date(`${stamp}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(stamp) && stamp >= "2026-10-19";
};

const checkedPath = (root, relative) => {
  assert.ok(typeof relative === "string" && relative !== "" && !path.isAbsolute(relative) &&
    !relative.split("/").some((part) => part === "" || part === "." || part === ".." || part.includes("\\")),
  `Invalid verification path: ${relative}`);
  const absolute = path.resolve(root, relative);
  assert.ok(absolute.startsWith(`${root}${path.sep}`), `Verification path escapes root: ${relative}`);
  return absolute;
};
const relativePath = (root, absolute) => path.relative(root, absolute).split(path.sep).join("/");
const optionalStat = async (filename) => {
  try { return await lstat(filename); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
};
const directoryAt = async (root, relative, required) => {
  const parts = relative.split("/");
  for (let count = 1; count <= parts.length; count++) {
    const directory = checkedPath(root, parts.slice(0, count).join("/"));
    const entry = await optionalStat(directory);
    if (!entry) {
      if (required) throw new Error(`Required native verification directory is missing: ${relative}`);
      return false;
    }
    if (!entry.isDirectory()) throw new Error(`Unsupported native verification directory: ${directory}`);
  }
  return true;
};
const fileAt = async (root, relative, required) => {
  const filename = checkedPath(root, relative);
  const parts = relative.split("/");
  for (let count = 1; count < parts.length; count++) {
    const parent = path.join(root, ...parts.slice(0, count));
    const parentEntry = await optionalStat(parent);
    if (!parentEntry) {
      if (required) throw new Error(`Required native verification parent is missing: ${relative}`);
      return false;
    }
    if (!parentEntry.isDirectory()) throw new Error(`Unsupported native verification parent: ${parent}`);
  }
  const entry = await optionalStat(filename);
  if (!entry) {
    if (required) throw new Error(`Required native verification input is missing: ${relative}`);
    return false;
  }
  if (!entry.isFile()) throw new Error(`Unsupported native verification input: ${relative}`);
  assert.ok((await realpath(filename)).startsWith(`${root}${path.sep}`), `Input escapes root: ${relative}`);
  return true;
};
const walk = async (root, directory, files) => {
  const entry = await lstat(directory);
  if (!entry.isDirectory()) throw new Error(`Unsupported native verification directory: ${directory}`);
  for (const child of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(child.name) || excludedPattern.test(child.name)) continue;
    const filename = path.join(directory, child.name);
    if (child.isDirectory()) await walk(root, filename, files);
    else if (child.isFile()) files.push(relativePath(root, filename));
    else throw new Error(`Unsupported native verification entry: ${filename}`);
  }
};

export const nativeVerificationInputs = async (sourceRoot) => {
  const root = await realpath(sourceRoot);
  const files = [];
  for (const name of roots) await walk(root, checkedPath(root, name), files);
  for (const relative of requiredFiles) {
    await fileAt(root, relative, true);
    files.push(relative);
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (/^tsconfig[^/]*\.json$/.test(entry.name) || /^vite[^/]*\.ts$/.test(entry.name)) {
      if (!entry.isFile()) throw new Error(`Unsupported root input: ${entry.name}`);
      files.push(entry.name);
    }
  }
  for (const relative of optionalFiles) if (await fileAt(root, relative, false)) files.push(relative);
  for (const relative of selectedDirectories) {
    if (await directoryAt(root, relative, false)) await walk(root, checkedPath(root, relative), files);
  }
  for (const relative of requiredDirectories) {
    await directoryAt(root, relative, true);
    await walk(root, checkedPath(root, relative), files);
  }
  const implementation = checkedPath(root, "implementation");
  if (!(await lstat(implementation)).isDirectory())
    throw new Error("Unsupported native verification implementation directory");
  for (const entry of await readdir(implementation, { withFileTypes: true })) {
    if (!isCurrentImplementationUnitName(entry.name)) continue;
    if (!entry.isDirectory()) throw new Error(`Unsupported implementation input: ${entry.name}`);
    await walk(root, path.join(implementation, entry.name), files);
  }
  const sorted = files.sort();
  for (let index = 1; index < sorted.length; index++)
    assert.notEqual(sorted[index], sorted[index - 1], `Duplicate verification input: ${sorted[index]}`);
  for (const relative of sorted) await fileAt(root, relative, true);
  return sorted;
};

export const nativeVerificationContext = async (sourceRoot) => {
  const root = await realpath(sourceRoot);
  const rows = [];
  for (const relative of contextFiles) rows.push({ path: relative, available: await fileAt(root, relative, false) });
  return rows;
};

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inside = (parent, child) => child === parent || child.startsWith(`${parent}${path.sep}`);
const protectedDestinationParts = new Set([".git", ".cache", "node_modules", "target", "dist"]);
const allowedDestination = (root, destination) => {
  if (inside(destination, root)) return false;
  if (!inside(root, destination)) return true;
  const parts = path.relative(root, destination).split(path.sep);
  return !parts.some((part) => protectedDestinationParts.has(part)) &&
    parts.some((part) => /^(?:proof|evidence)(?:-|$)/.test(part));
};
export const stageNativeVerificationSource = async (sourceRoot, destinationRoot) => {
  const root = await realpath(sourceRoot);
  const destination = path.resolve(destinationRoot);
  assert.ok(allowedDestination(root, destination), "Staging destination overlaps selected source");
  let existing = destination;
  while (!(await optionalStat(existing))) existing = path.dirname(existing);
  const resolvedDestination = path.resolve(await realpath(existing), path.relative(existing, destination));
  assert.ok(allowedDestination(root, resolvedDestination), "Staging destination resolves into selected source");
  const destinationEntry = await optionalStat(destination);
  if (destinationEntry && !destinationEntry.isDirectory())
    throw new Error(`Unsupported staging destination: ${destination}`);
  if (destinationEntry)
    assert.equal((await readdir(destination)).length, 0, "Staging destination must be empty");
  const paths = await nativeVerificationInputs(root);
  const selected = new Set(paths);
  for (const context of await nativeVerificationContext(root)) {
    if (context.available && !selected.has(context.path)) {
      paths.push(context.path);
      selected.add(context.path);
    }
  }
  paths.sort();
  for (const relative of paths)
    assert.ok(!inside(destination, checkedPath(root, relative)),
      `Staging destination contains a selected input: ${relative}`);
  await mkdir(destination, { recursive: true });
  const actualDestination = await realpath(destination);
  assert.ok(allowedDestination(root, actualDestination), "Staging destination resolves into selected source");
  const files = [];
  for (const relative of paths) {
    const source = checkedPath(root, relative);
    const target = checkedPath(actualDestination, relative);
    await fileAt(root, relative, true);
    await mkdir(path.dirname(target), { recursive: true });
    const parts = relative.split("/");
    for (let count = 1; count < parts.length; count++) {
      const parentEntry = await lstat(path.join(actualDestination, ...parts.slice(0, count)));
      assert.ok(parentEntry.isDirectory(), `Unsupported staging directory: ${relative}`);
    }
    const parent = await realpath(path.dirname(target));
    assert.ok(inside(actualDestination, parent), `Staging path escapes destination: ${relative}`);
    assert.equal(await optionalStat(target), null, `Staging target already exists: ${relative}`);
    const original = await readFile(source);
    await copyFile(source, target, constants.COPYFILE_EXCL);
    const copied = await readFile(target);
    const current = await readFile(source);
    const sha256 = digest(original);
    assert.ok(digest(copied) === sha256 && digest(current) === sha256 &&
      copied.length === original.length && current.length === original.length,
    `Native verification source changed during staging: ${relative}`);
    files.push({ path: relative, sha256, bytes: original.length });
  }
  const finalPaths = await nativeVerificationInputs(root);
  const finalSelected = new Set(finalPaths);
  for (const context of await nativeVerificationContext(root)) {
    if (context.available && !finalSelected.has(context.path)) {
      finalPaths.push(context.path);
      finalSelected.add(context.path);
    }
  }
  finalPaths.sort();
  assert.deepEqual(finalPaths, paths, "Native verification source selection changed during staging");
  for (const entry of files) {
    await fileAt(root, entry.path, true);
    await fileAt(actualDestination, entry.path, true);
    const original = await readFile(checkedPath(root, entry.path));
    const copied = await readFile(checkedPath(actualDestination, entry.path));
    assert.ok(digest(original) === entry.sha256 && digest(copied) === entry.sha256 &&
      original.length === entry.bytes && copied.length === entry.bytes,
    `Native verification snapshot changed after staging: ${entry.path}`);
  }
  return { schemaVersion: 1, files };
};
