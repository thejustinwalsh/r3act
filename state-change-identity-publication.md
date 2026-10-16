# State-change identity and host JSX checkpoint

12 October 2026. Correctness and source attribution; no new speed verdict.

## Evidence driving the change

The locked V2 production comparison remains a failed speed gate. Separate CPU
profiles of its React and native 1,024-row pages both pass the complete workload
and teardown checks. An independent recomputation validates samples, weighted
self time, loaded production hashes and minified source excerpts.

The native profile attributes 113.081 ms of sampled self time to the root's
change subscriber and 118.273 ms to change completion. Their captured source
excerpts both construct owner/site strings. `setSources` accounts for another
102.210 ms, the DOM style writer 214.781 ms and `flush` 140.064 ms. These are
estimates across module loading, mounting, warmup, measured frames, harness
validation and disposal. They are not isolated commit timings or proof that
string allocation explains the complete React gap. Sampled GC self time is
54.341 ms in this native profile and 63.740 ms in React's; the greater allocation
volume does not establish GC as the dominant cause.

## Runtime change

`PendingStateChanges` caches a stable identity for each owner/site pair and uses
one insertion-order map for currently pending changes. Repeated dispatch and
completion avoid rebuilding composite strings. The immutable change record and
version check are retained; interleaved owners preserve global insertion order.
Full, sparse and numeric commits share its version-aware acknowledgement.
Owner teardown releases cached identities, and root disposal clears the index.

This trades persistent per-live-site identities and per-owner maps for fewer
temporary strings. Live memory, mount cost and actual browser throughput need
measurement. The change is an attributed candidate, not an established win.

The ordinary numeric-only path also now guards snapshot restoration by owner
liveness, site version and source identity. Previously, a host writer that
synchronously dispatched a newer state value could have that source overwritten
in cleanup. Two regression cases fail with the old restoration (expected 9,
received 2) and pass with the fix. One verifies the newer value reaches the host
on the next flush; the other verifies preservation when the writer throws.

## Compiler feature

The Vite entry's `jsxHosts` registration generates type-only extensions for both
automatic JSX runtimes from a constructor namespace and a host intrinsic-map
type. TypeScript/tsgo infers arguments, properties and refs; Rust/OXC continues
to emit runtime plans and transforms. Generation is explicitly configured and
does not discover arbitrary runtime namespace expressions or infer lifecycle
policies. Unchanged output is preserved; authored declarations are not replaced.

Actual TSX checks cover both JSX modes, invalid arguments/props, inferred refs,
live namespace edits and a separate non-Three host. A freshly installed private
package generates and checks a custom Three host's declarations without Cargo.

## Verification and decision

443 runtime tests, 25 Rust tests and 46 integration commands pass. Coverage
includes authored-module state/store/task execution, sparse/full candidates,
retention probes, input/caret/composition simulation, coordinated async roots,
Suspense replacement, HMR cleanup, the Three host and installed packaging.
The six-page production candidate pilot passes props, order, retained identity,
mount/cleanup balance and teardown at 128/512/1,024 rows for both arms.

The candidate build lives in `dist-product-mixed-candidate`; the frozen
`dist-product-mixed-v2` artifact and its records are unchanged. The pilot is
correctness evidence only. The next finite decision is a separately named,
preregistered comparison of this candidate using the existing workload and
speed thresholds, with separate allocation evidence. No new backend or storage
family is justified here. Independent-device, comparative human maintenance and
the held Sol review gates remain open.
