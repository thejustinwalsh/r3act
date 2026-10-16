# Internal comment cleanup review

Status: staged, unrun comment-only patch for primary review. The live source files are unchanged.

## Scope and classification

Audited the current production files `src/component_state_runtime.ts`, `src/vdom_snapshot_runtime.ts`, `src/owner_state_world.ts`, `src/compiled_state_layout.ts`, `src/native_runtime_api.ts`, and `compiler/oxc-spike/src/main.rs`. The patch shortens 32 private implementation comment blocks to at most two content lines. It does not edit public TSDoc/API descriptions (`/** ... */` and Rust `///`), names, code, or behavior. The two layout/API files had no qualifying internal blocks; they are included in the audit but unchanged.

Examples of private invariants retained in the shorter wording:

- Component runtime: capture buffers stay owned by the outer flush during reentry; retry uses the same captured source cut after mutation-free VDOM preflight decline; refs/effects wait until successful publication.
- VDOM: diff against the writer's last committed value; capture projections before host calls; validate untouched dependencies because shared leases can be cleared on promotion or row retirement.
- World: discard work is proportional to private owners plus removed cells; absent fallback means no surviving private owner depends on the capture.
- Rust compiler: coalesce overlapping nested-use edits before emitting the Vite source-map edit; retain a stable missing-index placeholder for repeated-host templates.

## Review artifact

`comment-only.patch` is generated against the live source snapshot under `proposed/`. The proposed tree is a mirror and was scanned again: no private `//` or non-doc block has more than two content lines. No tests, builds, servers, or benchmarks were run, as requested.
