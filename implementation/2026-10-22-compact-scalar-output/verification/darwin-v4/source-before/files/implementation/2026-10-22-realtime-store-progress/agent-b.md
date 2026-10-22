# Compiled realtime Store progress fixture handoff

Authored only `compiler/compiled_realtime_store_progress_test.mjs` and this note. The fixture has not run; no tests, typechecks, builds, benchmarks, browsers, servers or Git commands were executed.

The fixture writes ordinary TSX source, transforms it through the current native Rust/OXC compiler and imports the compiled module. AST assertions require the dynamic control-array `Scene` parent to have no closed Store host/execution metadata, while `Motion`, `Alternate` and `Marker` have actual schema-2 numeric functions and the expected raw host keys. The marker also requires schema-5 host metadata. There is no hand-authored optimized metadata or timing loop.

Two public Native roots share a control Store and a frame Store but retain separate accepted histories. Normal frame-only updates require four verified closed rows, zero owner body renders, exact marker/host values and stable motion/child identities while the generic control Store remains subscribed and unchanged. For each control reset, add, reorder, reinsert and remove, the fixture dispatches a fresh clock action before **every** bounded public `flush()` and requires the current keyed host order within four flushes. Surviving keyed owners and authored children must retain identity; a removed then reinserted owner must receive a new target. It preserves a saved accepted snapshot, dispatches a newer frame action from a host write and checks exact old-cut then newer publication. The second root must remain on its old accepted snapshot until independently flushed, also with fresh clock actions before each attempt.

The fixture uses `MemoryVDOMHost` for deterministic public host/tree inspection. It does not claim Three resource disposal or held-resource coverage; Agent A's Deno regression and the separate installed/browser lifecycle proof own those checks. Its `result.json` records compiler/source/transform SHA-256 values beneath a unique `.cache/compiled-realtime-store-progress-*` artifact directory, matching existing compiled fixture provenance style. Primary wires this new file into the platform runner. Source assertions alone do not prove the new Root policy; Luna's consolidated gate must execute it and preserve any failure.

Luna command after primary integration review:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-realtime-store-progress/verification/darwin-v1 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
```
