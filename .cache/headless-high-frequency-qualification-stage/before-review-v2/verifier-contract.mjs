export const requiredExactSourcePaths = [
  "src/component_state_runtime.ts", "src/vdom_snapshot_runtime.ts", "src/owner_state_world.ts",
  "src/compiled_state_layout.ts", "src/native_runtime_api.ts", "compiler/oxc-spike/src/main.rs",
  "compiler/oxc-spike/src/owner_update_program.rs", "compiler/vite_native_plugin.ts",
  "compiler/vite_native_module.ts",
];

export const requiredStagedHarnessSuffixes = ["src/browser/high_frequency_harness.ts", "src/browser/high_frequency_contract.ts",
  "src/browser/native_high_frequency_arm.tsx", "src/browser/react_high_frequency_arm.tsx", "src/browser/high_frequency.css"];
export const sourceLockCoverageErrors = (locks) => [
  ...requiredExactSourcePaths.filter((name) => !Object.hasOwn(locks ?? {}, name)).map((name) => "source/build lock omits exact path: " + name),
  ...requiredStagedHarnessSuffixes.filter((suffix) => !Object.keys(locks ?? {}).some((name) => {
    const normalized = name.replaceAll("\\", "/");
    return normalized.startsWith(".cache/high-frequency-harness-stage/") && normalized.endsWith(suffix);
  })).map((name) => "source/build lock omits staged harness path: " + name),
];

export const buildProofErrors = (proof, locks) => {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const arraysEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  check(proof?.schemaVersion === "high-frequency-build-proof-v2" && proof.status === "PASS" && proof.productionBuild === true,
    "build proof must describe a passing production build v2");
  const native = proof.transforms?.native;
  const react = proof.transforms?.react;
  check(native?.conditionalMapsBothNativeRows === true, "native conditional map does not cover both rows");
  for (const name of ["NativeRowA", "NativeRowB"]) {
    const assertion = native?.assertions?.find((item) => item.name === name);
    check(assertion?.emittedComponent === true && assertion.programIdMatchesComponent === true &&
      assertion.stateLayout === true && assertion.threeStateSites === true, "native transform proof missing for " + name);
    check(assertion?.ownerUpdateProgram === true && assertion.ownerUpdateSchemaVersion === 2 &&
      assertion.ownerUpdateSixArgs === true && assertion.ownerUpdateSlotCount === 3 && assertion.ownerUpdateSinkCount === 3 &&
      assertion.ownerUpdateProgramId === assertion.componentId && assertion.programId === assertion.componentId &&
      assertion.ownerUpdateProgramIdMatchesComponent === true, "native schema-v2/six-argument/three-slot proof mismatch for " + name);
    const registration = native?.nativeRegistrations?.find((item) => item.componentId?.endsWith("#component:" + name));
    check(registration?.programId === assertion?.programId && registration?.schemaVersion === 1 &&
      registration?.slots?.length === 3 && registration.slots.every((slot, index) => slot.slot === index) &&
      registration.ownerUpdateKernelTable === assertion.ownerUpdateKernelTable &&
      registration.ownerUpdateKernelIndex === assertion.ownerUpdateKernelIndex, "native registration link mismatch for " + name);
    const kernel = native?.nativeOwnerUpdateKernels?.find((item) => item.index === registration?.ownerUpdateKernelIndex);
    check(kernel?.tableName === "__nativeOwnerCutKernels" && kernel?.programId === registration?.programId &&
      kernel?.schemaVersion === 2 && kernel?.slotCount === 3 && kernel?.sinkIds?.length === 3 &&
      arraysEqual(kernel?.executeCutParameters, ["changedSlots", "changeCount", "rowStates", "stagedInputIndices", "stagedSinkIds", "stagedValues"]),
    "native executable kernel mismatch for " + name);
  }
  for (const name of ["ReactRowA", "ReactRowB"]) {
    const assertion = react?.assertions?.find((item) => item.name === name);
    check(assertion?.present === true && assertion.memoCacheAllocation === true && assertion.memoCacheReadWrite === true,
      "React compiler memo cache proof missing for " + name);
    check(proof.reactRowCompilerSuccesses?.some((item) => item.fnName === name && item.memoSlots === 11) === true,
      "React compiler success event missing for " + name);
  }
  const sourceLock = proof.sourceHashLock;
  check(!!sourceLock?.path && /^[a-f0-9]{64}$/.test(sourceLock.sha256) && locks?.[sourceLock.path] === sourceLock.sha256,
    "build proof source hash lock is not bound to frozen inventory");
  return errors;
};
