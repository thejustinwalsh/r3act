# Callback-free grouped acceptance: verification contract

Source basis: initial implementation HEAD `7d4a66169efabe56581ab91490eba7afb0bcd6e4`, the 19 October first-pass source audit, and the reviewed forked-transition workload. This is a source-only harness preparation; no build, test, browser or timing has run for this unit.

Replaced mechanism: a grouped candidate may reread caller-owned frozen Proxy descriptors in its accepted `publish()` phase after an earlier member has accepted. A trap can then throw, leaving divergent accepted histories. The invariant authority remains the existing Root/World code, owner, writer, resource and publication state; the repair must not add a second version or accepted-history registry.

Required semantics: finish caller-observable validation before any grouped member accepts; retain one final live validation after the last caller callback; accept only if all members remain current; preserve exact captured acknowledgements, newer reentrant actions, standalone candidate semantics, independent accepted histories, generic fallback and original-error quarantine on partial host failures. The actual-compiled regression must exercise a legal frozen structural element with Proxy props in a later root alongside an earlier grouped root, and verify that no late trap runs after acceptance starts.

Measured budget: one consolidated correctness gate and one bounded Native-first matched C-settlement pair. The comparison's source-locked authored workload already has a shared-resource DOM/Three acceptance path and an equal-preload React arm. It observes settlement-to-MutationObserver before paint; no speed claim is registered. Existing physical layouts remain unchanged and physical selection is HOLD.

Falsifiers: the Proxy trap runs after the first root accepts; final freshness is skipped; reentrant actions are acknowledged away; independent accepted histories diverge after a rejected group; the generic fallback disappears; actual Rust or React Compiler proof is absent; paired output/lifetimes differ; or any locked source, compiler, transform or asset hash drifts. A build-only timing cannot replace this execution comparison.
