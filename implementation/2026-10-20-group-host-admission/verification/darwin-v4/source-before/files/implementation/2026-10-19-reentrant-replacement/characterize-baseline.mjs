import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RootWorkQueue } from "./baseline/root_work_queue.ts";

const unit = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
assert.ok(args.includes("--output-dir"), "--output-dir NEW_DIR is required");
const output = path.resolve(args[args.indexOf("--output-dir") + 1]);
assert.ok(output.startsWith(path.join(unit, "verification") + path.sep));
await mkdir(output, { recursive: false });
const provenance = JSON.parse(await readFile(path.join(unit, "baseline/provenance.json")));
const bytes = await readFile(path.join(unit, provenance.copiedPath));
assert.equal(createHash("sha256").update(bytes).digest("hex"), provenance.sha256);
const result = { status: "STARTED", provenance, scenarios: [], errors: [] };
try {
  for (const order of [["C", "B"], ["B", "C"]]) {
    const queue = new RootWorkQueue(new Map([["root", 0]]));
    const commits = [], callbacks = [];
    let nested;
    const definition = id => ({ id, key: "route", roots: ["root"], pending: [id],
      prepare: ({ versions }) => [{ rootId: "root", baseVersion: versions.get("root"),
        targetVersion: versions.get("root") + 1, value: id }],
      commit: candidates => commits.push(candidates[0].value),
      onSettled: resolution => callbacks.push([id, resolution.status]) });
    const first = definition("A");
    const notify = first.onSettled;
    first.onSettled = resolution => {
      notify(resolution);
      if (resolution.status === "cancelled") nested = queue.enqueue(definition("C"));
    };
    const a = queue.enqueue(first);
    const b = queue.enqueue(definition("B"));
    assert.equal(a.status, "cancelled");
    assert.equal(b.status, "pending");
    assert.equal(nested.status, "pending");
    for (const id of order) (id === "B" ? b : nested).resolve(id);
    assert.deepEqual(commits, order);
    assert.equal(b.status, "committed");
    assert.equal(nested.status, "committed");
    result.scenarios.push({ order, a: a.status, b: b.status, c: nested.status,
      commits, callbacks, acceptedVersion: queue.getVersion("root") });
  }
  result.status = "EXPECTED_BUG_REPRODUCED";
} catch (error) {
  result.status = "FAIL_OR_INCOMPLETE";
  result.errors.push(error.stack ?? String(error));
  process.exitCode = 1;
} finally {
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
}
console.log(JSON.stringify({ status: result.status, scenarios: result.scenarios.length }));
