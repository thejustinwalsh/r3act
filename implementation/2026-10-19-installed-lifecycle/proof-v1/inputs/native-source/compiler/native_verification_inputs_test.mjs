import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { nativeVerificationContext, nativeVerificationInputs,
  stageNativeVerificationSource } from "../scripts/native_verification_inputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

test("the real native source selection stages exactly and rejects unsafe inputs", async () => {
  const owned = await mkdtemp(path.join(tmpdir(), "r3act-native-source-test-"));
  try {
    const paths = await nativeVerificationInputs(root);
    assert.ok(paths.includes("scripts/native_verification_inputs.mjs"));
    assert.ok(paths.includes("compiler/native_verification_inputs_test.mjs"));
    assert.ok(paths.includes("src/native_runtime_api.ts"));
    assert.ok(paths.every(p => p === "implementation/2026-10-16-publication/verification/deno-runtime.lock" ||
      !/(?:^|\/)(?:baseline|proof(?:-[^/]*)?|verification|evidence|\.cache|node_modules|target|dist)(?:\/|$)/.test(p)),
      "source selection includes historical evidence or generated output");
    assert.deepEqual(paths, [...paths].sort());
    const context = await nativeVerificationContext(root);
    assert.ok(context.some(row => row.path === "AGENTS.md" && row.available));
    assert.ok(context.some(row => row.path === "final-master-plan.md" && row.available));
    assert.ok(context.some(row => row.path === "implementation-checkpoint.md" && row.available));

    const destination = path.join(owned, "staged");
    const manifest = await stageNativeVerificationSource(root, destination);
    assert.equal(manifest.schemaVersion, 1);
    assert.deepEqual(manifest.files.map(row => row.path), [...new Set([
      ...paths, ...context.filter(row => row.available).map(row => row.path),
    ])].sort());
    for (const row of manifest.files) {
      const [source, copy] = await Promise.all([
        readFile(path.join(root, row.path)), readFile(path.join(destination, row.path)),
      ]);
      assert.equal(row.bytes, source.length, row.path);
      assert.equal(sha256(source), row.sha256, row.path);
      assert.equal(sha256(copy), row.sha256, row.path);
    }

    const occupied = path.join(owned, "occupied");
    const first = paths[0];
    await mkdir(path.dirname(path.join(occupied, first)), { recursive: true });
    await writeFile(path.join(occupied, first), "preexisting");
    await assert.rejects(stageNativeVerificationSource(root, occupied), /must be empty|already exists/);
    assert.equal(await readFile(path.join(occupied, first), "utf8"), "preexisting");

    const missing = path.join(owned, "missing");
    await mkdir(missing);
    await assert.rejects(nativeVerificationInputs(missing), /native verification directory|ENOENT/);

    const linked = path.join(owned, "linked");
    for (const folder of ["src", "compiler", "packages", "scripts", "implementation"])
      await mkdir(path.join(linked, folder), { recursive: true });
    await symlink(path.join(root, "package.json"), path.join(linked, "src", "linked.json"));
    await assert.rejects(nativeVerificationInputs(linked), /Unsupported native verification entry/);
  } finally {
    await rm(owned, { recursive: true, force: true });
  }
});
