# Structural eligibility build gate — evidence report

## Outcome

The single approved build gate completed with overall exit code **1** and report status **FAIL**. Preserve this attempt; it was not rerun. The sole gate error is `Error: local bundle lacks compiler/native JSX/source-map provenance`, caused by one false local-bundle assertion: `reactMemoCache: false`. All other local-bundle predicates are true. The gate's emitted React-component memo checks are true.

The discrepancy is visible in the retained output: React Compiler emitted cache calls in `proof/react_array.tsx.emitted.txt`, and the bundled React functions call `(0, import_compiler_runtime.c)(8)` and `(0, import_compiler_runtime.c)(12)`. The gate checks for the literal `_c(` in the *bundled* text, which is absent after Vite bundling (`_c(` count 0); the `import_compiler_runtime.c` calls are present. This report identifies the assertion mismatch but does not change or waive it. The built React Compiler runtime and source-map provenance both appear in the bundle. See `react-cache-bundle-evidence.txt` and the retained JavaScript/source map for root review.

## Passed stages

- Preflight matched the approved input-lock SHA-256 `fe59755ce7b5949876cd43b3b17213a4bf9e0d296a6ba290db6fabbc1126ea09`, build-gate script SHA `5f752d4bd106fd18f17c5845979d4b9cfaf2c590bddd183b4ffda24331f5fb51`, and Vite config SHA `1b890fe05948e8af2f7d468cd55dd01d124db0cf5ee166d2ab9745c4e0ecc541`. All 413 lock entries are sorted, unique, present and matched before launch. All gate outputs were absent before invocation.
- Fresh Rust/OXC build used the isolated `eligibility/cargo-target`, existing `.cache/cargo`, and Cargo offline. Cargo exited 0; compiler binary SHA-256 is `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`; compiler `Cargo.lock` SHA is `a17f9726fff8c140b72e451361d793a3fcade85c1929dda7955ef12df487e69f`. No prebuilt fallback was used.
- Positive Vite build exited 0 through the public composed plugin. Native and generic Rust plan/schema/source/site/effect checks passed, native collection eligibility was present, and emitted native JSX was present. Both React component memo checks passed on emitted source.
- The negative build exited 1 as intended and contained the exact unsupported-index diagnostic. The gate marked its expected negative proof true.
- Local bundle component names, native site IDs, React Compiler runtime source-map provenance, native JSX runtime source-map provenance, entry registry, HTML and source map are present. Local output JS/map/HTML hashes are in `build-gate-report.json`; these assets were not served.

## Preservation and execution

The command ran once with Node `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node`, `login:false`, pinned Node on `PATH`, and `CARGO_NET_OFFLINE=true`. The agent-local exec handle was 36757 and terminated with exit 1. The wrapper emitted no stdout/stderr; the gate preserved per-command stdout/stderr, exact exit/signal, Rust responses, binary, emitted proof files, local bundle, source map, HTML, and failed report under the eligibility stage. `process.json` and `gate-driver.*` preserve invocation/terminal receipts.

An independent after-audit confirms the same 413 sorted locked originals and lock self hash, and the gate's 826 before/after input records all match. All 111 original qualified result files, 13 CPU diagnostic files, 95 targeted control files, aggregate review and current paper/notebook/master-plan/checkpoint/archive documents retain their before hashes. The gate script and config are unchanged. Detailed per-path hashes are in `before.json` and `after.json`.

This is only build/source-eligibility evidence. No server, browser, runtime tests, runtime interaction, structural edit schedule, benchmark, allocation capture or full matrix ran. The local assets are unserved; **runtime delta remains unverified**. The React bundle assertion failure is preserved for Sol/primary review; no files outside the owned verification directory were repaired or edited.
