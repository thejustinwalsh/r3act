# Resource host-value comparison

Status: source prepared, not built or run. This protocol adapts the prior [resource-subtree interaction](../../2026-10-18-resource-subtree/benchmark/README.md) without changing its historical source or results.

Native and React Compiler mount revealed A, styled initial B fallback and an independent stateful row. The row receives one untimed click; A then selects an unrelated pending resource and retains accepted UI. B receives the same controlled numeric result 7. Its ready subtree has two keyed children and declarative ``style={{ opacity: value / 10, transform: `translateX(${value}px)` }}``. B's fallback carries local state and an activation effect; reveal must retire it once. Native uses activation `useEffect`, React uses layout effect. A later resolves outside timing; B and the clicked row must remain.

The sole native-first matched pair times B settlement to the first matching MutationObserver callback with text/count and inline opacity `.7` / transform `translateX(7px)`. The timestamp precedes inspection, style or layout reads. This includes scheduling and observer delivery before paint; it does not measure CPU, physical input, presentation, network, tail or general async UX. Defined output includes the inline style values and must match between arms. Both tear down all DOM; Native releases owners and Store readers/listeners. Mount/disposal and timer quantum are reported separately.

After the consolidated correctness gate, Luna builds once into a new exclusive proof directory. Build/source/binary hashes, actual Rust/OXC schema-3 style data and resource/site/revision provenance, fallback hook sites and actual React Compiler output gate admission. The build is bounded to 180 seconds with owned process-group cleanup. Primary reviews `build-proof.json` and writes its hash-bound `run-authorization.json`; Luna then runs one 90-second headless, GPU-disabled, interruptible pair. Every failure and incomplete receipt is preserved; no favorable timing retry is allowed.

The browser replays only source-locked production assets at a synthetic HTTPS `.localhost` origin and blocks all other requests. No project server, actual network/TLS connection, Portless route or trust change is needed. A future server would require the Portless skill. Required setup/proof/hash work can prime caches. This comparison supplies no independent-device, cold-memory, cross-renderer visual-atomicity or broad performance qualification; the Three tuple capability is covered separately by actual compiled correctness fixtures.

```sh
NODE=/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node
PROOF="$PWD/implementation/2026-10-18-resource-values/benchmark/proof-v1"
"$NODE" implementation/2026-10-18-resource-values/benchmark/build-gate.mjs --proof-dir "$PROOF"
# Primary reviews the actual proof and writes hash-bound authorization.
"$NODE" implementation/2026-10-18-resource-values/benchmark/run-pair.mjs --proof-dir "$PROOF" --origin https://resource-values-proof.localhost
```
