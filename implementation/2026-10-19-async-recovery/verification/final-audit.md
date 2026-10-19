# Async recovery final audit

The single authorized Native-first measured pair passed on headless Chromium 153.0.8010.12. Both arms reported 0.9 ms from final retry provider resolution to the first matching `MutationObserver`, at a reported 0.1 ms timer quantum. Scheduling and observer delivery are included; paint is excluded. This is one descriptive pair, not CPU, tail, cold-start, memory, or device qualification.

Both arms produced `{ value: "recovered", x: "7", urgent: "2", staleVisible: false }`. The first attempt committed, the stale attempt cancelled, and retry committed. Urgent state stayed visible while pending; the accepted error remained visible; the cancelled late result was discarded. Ready mount/cleanup counts balanced after disposal, with no remaining children, browser errors, request failures, or blocked requests. The browser closed cleanly.

The proof-v2 build recorded React memo groups `Ready=[4]` and `App=[12]`, a complete native semantic plan, and zero source drift. Native metadata was found for all seven expected components; the generic recovery path has no closed program. Compiler SHA-256 remained `52c0021bd5bffa67de3472a0139c85159483ae20f1482dd7f8ac8c6f4160ea7f` before and after capture.

Darwin-v3 passed all 38 gate steps: 1007 runtime tests, 64 Rust tests, and 24 compiled fixtures, plus the tooling, source/artifact, host, GC, and package checks. All 913 archived gate inputs match their archived copies. The 905-entry before and after source manifests match their archived snapshots; comparison against the current tree shows only the expected comparator edit in `implementation/2026-10-19-async-recovery/comparison/react_arm.tsx`. The proof-v2 source lock and build assets had no drift at browser capture.

Darwin-v1 and Darwin-v2 failure outputs remain preserved. `research.ipynb` remains at 208 cells with no diff from HEAD. The only tracked source-file diff from HEAD is `src/component_state_runtime.ts`; no prior dense or legacy source modules changed. Tracked files changed for this unit are listed in `final-audit.json`.

The measured receipt, authorization, build proof, behavior receipt, and source lock hashes, along with machine-readable counts and statuses, are recorded in `final-audit.json`.
