# Artifact verifier evidence

## Result

The one authorized read-only run passed with `CORRECTED_ARTIFACT_CHECK_PASS_BUILD_PROVENANCE_ONLY` (actual Node exit 0; stdout and stderr empty). The original `build-gate-report.json` remains `FAIL`; this static correction verifies the provenance in its exact retained local build and does not execute the structural runtime delta. The local assets remain unserved, and runtime delta remains **UNVERIFIED**.

The verifier accepted the exported `ReactArrayBoard` wrapper and checked direct cache initialization per function: 8 slots for `ReactRow`, 12 for `ReactArrayBoard`. Babel AST checks bind calls to `import_compiler_runtime.c`, bind that import through `require_compiler_runtime`, and verify the local React runtime bridge calls `useMemoCache`. All seven adversarial synthetic cases were rejected, including missing/wrong cache cases for the exported board. No compiler purity or runtime cache execution claim follows from this static evidence.

## Input and artifact preservation

The approved verifier SHA-256 is `15afff95a9b3d0a6ab6103ccdf5aba31294782c98a52daec1559a74d174e38ef` and README SHA-256 `f3f2c48eceab80e6003da04d9e42ef096380c4c3224135bd8fcb76888cda0d25`. The 413 sorted, unique input-lock entries and lock self SHA `fe59755ce7b5949876cd43b3b17213a4bf9e0d296a6ba290db6fabbc1126ea09` match before and after. Original failed report, binary, bundled JavaScript, emitted React proof, local HTML/source map, other emitted proof, command logs, and raw Rust responses all match the approved hashes and remain unchanged. The exact `verification-report.json` reports the frozen artifact hashes, 413 input checks, proof fields and local source-map provenance. See `before.json` and `after.json` for per-path SHA-256 receipts.

Parser identity captured from the installed dependency chain only: Babel Core 7.29.7 at `/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/node_modules/.pnpm/@babel+core@7.29.7/node_modules/@babel/core/lib/index.js` (entry SHA-256 `dba868255b447218cd421b30fb5289c118f265817088e7106053cf962057dd26`) and Babel Parser 7.29.9 at `/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/node_modules/.pnpm/@babel+parser@7.29.9/node_modules/@babel/parser/lib/index.js` (entry SHA-256 `82d72e197e27bf909ae10ffc8d1a969aeb94fe96ec96c4e9cb685a0a8229e40c`). Package hashes and unchanged after-hashes are also recorded. Babel parsing was configured with `babelrc:false` and `configFile:false`.

## Invocation and limits

Command: `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/artifact-verifier-v1/verify.mjs` from the repository root, with login disabled. Raw stdout, stderr and exit code are in `verifier.stdout.log`, `verifier.stderr.log`, and `verifier.exit-code`. The tool wrote only the exclusive `verification-report.json`; this evidence directory contains the independent pre/post audit. No rebuild, server, browser, benchmark, runtime test, dependency install, network access, source/config change, or artifact repair was performed.

The earlier build-preservation snapshot's `implementation-checkpoint.md` hash was `1cb739c5…`; before this verifier it was `6fc5c24a…`, and in the after-audit it was `e8158cd3…`. This non-lock document changed after the prior build snapshot and during the verification window. It is not among the 413 gate inputs; the discrepancy is recorded and is not described as unchanged. The frozen 413 inputs and all build artifacts remained unchanged.
