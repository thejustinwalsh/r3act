# Runtime gate v1 build-only evidence

## Invocation and result

- Command: `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v1/build-gate.mjs`
- Working directory: `/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research`; login shell disabled.
- Pinned Node: `v24.18.0`.
- Tool result: terminal `exit_code=1`, wall time 0.518 s, no session ID returned (there was no live process to poll). No retry was made.
- Gate report status: `FAIL`; report SHA-256: `ad1c0d43e87d92524e83e05a2a5e21b850b6c6e8244a57bb51caf358ab442c25`.

## Failure

Vite reported `Build failed in 362ms`; 18 modules had transformed. During `closeBundle`, plugin `runtime-gate-react-capture` got `EEXIST` opening `proof/react_controller.tsx.emitted.txt`. The gate recorded the failed Vite exit (`code: 1`, `signal: null`) and preserved the failure. The partial output has no `dist/`; `proof/` exists with 2 emitted proof files: `react_array.tsx.emitted.txt`, `react_controller.tsx.emitted.txt`. These are partial failure artifacts, not a complete build proof.

Raw output receipts:

- Gate wrapper stdout/stderr are empty; actual exit is in `gate.exit-code`.
- Vite stdout: `.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v1/vite.stdout.log` (SHA-256 `5249067a83b4ec63a72d17da7747fd80df4fd1f1cfb2ae8db611832155493cb5`).
- Vite stderr: `.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v1/vite.stderr.log` (SHA-256 `eb1e09eabe479c5fd32c133f9241e19e746e6bf685cf27946b0ed8073c874081`).
- Full structured failure: `../build-report.json` relative to this evidence directory.

## Preservation audit

- Before and after, all 424 entries in `runtime-gate-v1/input-lock.json` matched their listed SHA-256 values; lock self-hash remained `641ec9d9cb15837279638cbfd8620a1710202c2b3ba68345b786337ce68d716b`.
- The prior 413-entry source lock entries all matched before and after.
- The pinned compiler binary remained SHA-256 `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8` (expected `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`).
- All previously recorded original build, verifier, source, local asset, and proof artifacts in the preservation set were unchanged.
- Preflight records that `dist/`, `proof/`, `build-report.json`, and Vite logs were absent before launch. The current `proof/`, gate report, and Vite logs are outputs from this single failed invocation.
- Detailed receipts: `before.json`, `after.json`, `invocation.json`, `gate.stdout.log`, `gate.stderr.log`, and `gate.exit-code` in this directory.

## Interpretation

This gate did not establish a complete compiler/build provenance pass. No runtime page, browser, server, benchmark, or performance claim was made. The unchanged historical artifact verifier remains a separate local-artifact provenance result and does not repair this failed build.
