# Component output identity: verification in progress

The active source slice carries existing World owner identity into managed component output and VDOM compatibility. It restores the previously failing constant-explicit-host-key case; it is not yet a completed or qualified slice.

## Preserved initial consolidated failure

[Darwin-v1 receipt](verification/darwin-v1/receipt.json) exits 1: 63/64 phases pass. The four new VDOM identity tests and all 45 actual compiled fixtures pass, including the namespace fixture's constant-key owner replacement, primitives, keyed moves, refs/effects, resource lifetime, stale candidates, independent roots and host-create failure controls. Rust passes 85 tests; package validation passes. All 1480 captured source rows match before/after.

The full Deno suite reports 1089 passed and ten failed. Existing boundary, forwarding, joint-input and held-boundary reveal tests fail: strict owner comparison replaces fallback hosts instead of preserving the existing matching-key reveal path, which also bypasses the host update callbacks used by failure/reentry controls. This is an integration failure, not a green identity gate. [Raw assertions](verification/darwin-v1/logs/deno-full.log) are preserved. Source correction is under review; no tests are weakened.

Supervisor SHA-256: `3e1682330266ae02d38bcd62e1e9426b0dd16336134e5874d04ad815ab969c37`. Receipt SHA-256: `3672309b2d1dc873ad6114b3a64a1e91e2c08ddd1716f5abaff0feb5b5999a4c`.

No installed browser proof or timing was started after this failure. The earlier realtime timing remains immutable and is not inherited by current source. HMR delivery, realtime performance/cold/memory and independent-device requirements remain open. The full-plan goal remains active; no release or maintenance advantage is claimed.

## Preserved typecheck failure

[Darwin-v2 receipt](verification/darwin-v2/receipt.json) exits 1: sixty phases pass, three fail and the package consumer is skipped. Deno, native tooling and package build reject a `RuntimeNode` argument to the clean-counterpart WeakMap's object key; inequality against the original output does not narrow that union for TypeScript. Deno stops before runtime tests execute, so v2 does not reassess the ten v1 reveal failures or prove the new three boundary cases. All 45 compiled fixtures and 85 Rust tests pass; 1483 source rows match. No installed browser proof or timing starts.

Primary correction keeps the freshly marked RuntimeElement in a local constant inside the existing guarded adoption branch. The map receives that typed element directly; no cast, new runtime permission or semantic change is introduced. A fresh consolidated receipt is required.

Supervisor SHA-256: `6a2a5fb58c634e78cf3a3ad7e2485f1c6530ed43c892500b125f3fe3c766d77e`. Receipt SHA-256: `153535e54855f17d06b90c77354e4b3e6c073d6d2c5cccebf7ecd0d3435ce14e`.
