import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildProofErrors, requiredExactSourcePaths, requiredStagedHarnessSuffixes, sourceLockCoverageErrors } from "./verifier-contract.mjs";

const proofPath = ".cache/high-frequency-build-proof-20261013-03/build-proof.json";
const proof = JSON.parse(await readFile(proofPath, "utf8"));
const locks = Object.fromEntries(requiredExactSourcePaths.map((name) => [name, "0".repeat(64)]));
for (const suffix of requiredStagedHarnessSuffixes) locks[".cache/high-frequency-harness-stage/" + suffix] = "0".repeat(64);
locks[proof.sourceHashLock.path] = proof.sourceHashLock.sha256;
assert.deepEqual(buildProofErrors(proof, locks), [], "synthetic valid proof is accepted");
assert.deepEqual(sourceLockCoverageErrors(locks), [], "synthetic complete family inventory is accepted");

const mutations = [
  (copy) => { copy.transforms.native.assertions[0].ownerUpdateSchemaVersion = 1; },
  (copy) => { copy.transforms.native.assertions[0].ownerUpdateSixArgs = false; },
  (copy) => { copy.transforms.native.nativeRegistrations[1].ownerUpdateKernelIndex = 9; },
  (copy) => { copy.transforms.native.nativeOwnerUpdateKernels[0].executeCutParameters.pop(); },
  (copy) => { copy.transforms.react.assertions[0].memoCacheReadWrite = false; },
];
const rejected = mutations.map((mutate) => {
  const copy = structuredClone(proof);
  mutate(copy);
  return buildProofErrors(copy, locks).length > 0;
});
assert.deepEqual(rejected, [true, true, true, true, true], "schema/kernel/registration/React mutations are rejected");
assert.ok(sourceLockCoverageErrors({}).length === requiredExactSourcePaths.length + requiredStagedHarnessSuffixes.length, "empty source inventory is rejected");
console.log(JSON.stringify({ validProofAccepted: true, invalidProofsRejected: rejected.length,
  exactRuntimeCompilerPaths: requiredExactSourcePaths.length, stagedHarnessPaths: requiredStagedHarnessSuffixes.length }));
