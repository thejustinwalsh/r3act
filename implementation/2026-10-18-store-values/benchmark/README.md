# Structured Store transaction comparison

Source prepared, not built or run. This adapts the prior joint-input interaction into two declarative style leaves, preserving its historical source and results. Position Store 1→7 drives a translateX transform and, with camera fixed at 2, joint opacity .3→.9 and data-joint 3→9. The same declared transaction updates World 0→5 and moves row-0 to the tail of 64 keyed rows. An untimed click gives that row local state 1. Health remains independently pending, then reveals outside timing. Native uses the existing grouped Store/World/collection queue; React batches its external Store, local state and array order through flushSync. Native activation effects and React layout effects retain their documented semantics.

One fixed-order native-first pair measures first transaction action to the matching MutationObserver callback, including native cell-handle capture, queue work, React flushSync and observer delivery before paint. Timestamp precedes inspection/style/layout reads. Matching style values, host and keyed identities, row state, fallback retention/later reveal, reader/lifetime cleanup and empty teardown gate acceptance. Mount/disposal and timer quantum are separate. This is not CPU, physical input, displayed-frame, tail, cold-memory, independent-device or general performance qualification. Three tuple semantics are covered by actual compiled correctness fixtures, not this DOM timing.

After consolidated correctness, Luna builds once into a new proof directory. Actual Rust/OXC schema-3 style descriptors, ordered one/two-input sites, revisions, World numeric lowering, keyed transaction provenance and actual React Compiler transforms must match all source/compiler/assets hashes. The build is bounded to 180 seconds with owned process-group cleanup. Primary reviews the actual proof and writes hash-bound approval before one headless/GPU-disabled/offline 90-second pair. Preserve every failure; no favorable timing repeat. Use approved process access for Chromium to avoid the earlier command-sandbox startup failure. No project server, external network/TLS request, route or trust operation is needed; any future server requires Portless HTTPS and its skill.

```sh
NODE=/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node
PROOF="$PWD/implementation/2026-10-18-store-values/benchmark/proof-v1"
"$NODE" implementation/2026-10-18-store-values/benchmark/build-gate.mjs --proof-dir "$PROOF"
# Primary reviews the proof and writes hash-bound run-authorization.json.
"$NODE" implementation/2026-10-18-store-values/benchmark/run-pair.mjs --proof-dir "$PROOF" --origin https://store-values-proof.localhost
```
