import assert from "node:assert/strict";

assert.ok(process.argv.includes("--proof-dir") && !process.argv.includes("--phase"),
  "usage: node run-pair.mjs --proof-dir ABSOLUTE_REVIEWED_PROOF_DIR");
process.argv.push("--phase", "measured");
await import("./verify-browser.mjs");
