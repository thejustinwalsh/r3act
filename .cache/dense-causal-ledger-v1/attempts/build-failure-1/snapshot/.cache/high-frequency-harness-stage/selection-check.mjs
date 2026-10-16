import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selectDirtyIds } from "./src/browser/high_frequency_contract.ts";

const stage = path.dirname(fileURLToPath(import.meta.url));
const proof = process.env.HIGH_FREQUENCY_PROOF_DIR;
if (!proof) throw new Error("HIGH_FREQUENCY_PROOF_DIR is required");
const sizes = [128, 512, 1024, 4096, 10000];
const shapes = ["one", "bucket32", "all"];
const placements = ["contiguous", "scattered"];
let checks = 0;

for (const size of sizes) {
  for (const shape of shapes) {
    const count = shape === "one" ? 1 : shape === "bucket32" ? Math.min(32, size) : size;
    for (const placement of placements) {
      for (let frame = 1; frame <= 300; frame++) {
        const actual = selectDirtyIds(size, shape, placement, frame);
        const first = placement === "contiguous"
          ? count === size ? 0 : (frame * 17) % (size - count + 1)
          : (frame * 137) % size;
        const expected = placement === "contiguous"
          ? Array.from({ length: count }, (_, offset) => first + offset)
          : Array.from({ length: count }, (_, offset) => (first + offset * 997) % size);
        assert.deepEqual(actual, expected, `${size}/${shape}/${placement}/frame ${frame}`);
        assert.equal(actual.length, count, `${size}/${shape}/${placement}/frame ${frame} count`);
        assert.equal(new Set(actual).size, count, `${size}/${shape}/${placement}/frame ${frame} uniqueness`);
        assert(actual.every((id) => Number.isInteger(id) && id >= 0 && id < size));
        checks++;
      }
    }
  }
}

const result = {
  schemaVersion: "high-frequency-dirty-selection-check-v1",
  status: "PASS",
  sizes,
  shapes,
  placements,
  framesPerConfiguration: 300,
  configurationChecks: checks,
  selectionImplementation: "src/browser/high_frequency_contract.ts#selectDirtyIds",
  independentExpectedFormula: "independently regenerated from workload formulas; checks exact frame sequence, count, uniqueness, and bounds",
};
await mkdir(proof, { recursive: true });
await writeFile(path.join(proof, "selection-check.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(`Selection PASS: ${checks} size/shape/placement/frame combinations`);
