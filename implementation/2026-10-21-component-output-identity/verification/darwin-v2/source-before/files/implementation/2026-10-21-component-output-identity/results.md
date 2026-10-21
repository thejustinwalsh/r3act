# Component output identity: verification in progress

The active source slice carries existing World owner identity into managed component output and VDOM compatibility. It restores the previously failing constant-explicit-host-key case; it is not yet a completed or qualified slice.

## Preserved initial consolidated failure

[Darwin-v1 receipt](verification/darwin-v1/receipt.json) exits 1: 63/64 phases pass. The four new VDOM identity tests and all 45 actual compiled fixtures pass, including the namespace fixture's constant-key owner replacement, primitives, keyed moves, refs/effects, resource lifetime, stale candidates, independent roots and host-create failure controls. Rust passes 85 tests; package validation passes. All 1480 captured source rows match before/after.

The full Deno suite reports 1089 passed and ten failed. Existing boundary, forwarding, joint-input and held-boundary reveal tests fail: strict owner comparison replaces fallback hosts instead of preserving the existing matching-key reveal path, which also bypasses the host update callbacks used by failure/reentry controls. This is an integration failure, not a green identity gate. [Raw assertions](verification/darwin-v1/logs/deno-full.log) are preserved. Source correction is under review; no tests are weakened.

Supervisor SHA-256: `3e1682330266ae02d38bcd62e1e9426b0dd16336134e5874d04ad815ab969c37`. Receipt SHA-256: `3672309b2d1dc873ad6114b3a64a1e91e2c08ddd1716f5abaff0feb5b5999a4c`.

No installed browser proof or timing was started after this failure. The earlier realtime timing remains immutable and is not inherited by current source. HMR delivery, realtime performance/cold/memory and independent-device requirements remain open. The full-plan goal remains active; no release or maintenance advantage is claimed.
