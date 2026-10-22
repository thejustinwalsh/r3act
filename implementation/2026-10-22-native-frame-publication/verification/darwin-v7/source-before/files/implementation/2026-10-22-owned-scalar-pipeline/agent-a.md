# Sol A handoff: canonical World and Store phases

Owned files: `src/owner_state_world.ts`, `src/owner_state_world_test.ts`, `src/async_store_runtime.ts`, and `src/async_store_runtime_test.ts`. No tests, builds, benchmarks, browser, server, or VM were run by this implementation agent.

The exported interfaces are `validateCanonicalClosedWorldPhase(world, cut, phase)` and `validateCanonicalClosedStorePhase(transaction, phase)`. Each returns `"current" | "stale" | "public-required"` for `"prepared" | "after-host"`. C may use a `current` result only inside its independently proven whole passive interval. `stale` rejects the candidate; `public-required` must run the original public sequence, including callbacks. These helpers do not authorize publication, cache their answer, or replace the final private check after public or host work.

World first checks the private receiver and cut brands, then the exact ordinary prototype and the existing capture method descriptors (`cellHandle`, `scalarSourceForCell`, `versionForCell`, `ownerLineage`) and absence of own overrides. Capture and phase now share this audit. The existing private cut validator and phase share one cell loop. Removed owners, changed identity/source, mismatched same-version value and invalid prepared version are stale. A newer version remains valid after host with the same source, matching the prior cut rule. Lane-backed or accessor-shaped cells and uncertain source values request the public path. No getter or uncertain prototype chain is traversed for classification.

Store first checks the transaction private brand, exact prototype, and validation method descriptors. It checks the captured root/options fields and the owned projection snapshots. Each distinct Store instance gets a fresh exact canonical prototype audit and instance audit; each snapshot gets an exact method-shape and captured-field audit before the existing canonical prepared or lineage validator runs. An epoch/version failure is stale; subclass, own override, and non-owned snapshots require the public path. Reader history and pending membership stay with the existing publication path.

The phase operation does not enumerate readers. `StoreRenderTransaction.validate` and `validatePublicationInputs` iterate `#snapshots` and call snapshot freshness validators; neither method reads `#pending`, `#readers`, or `#values`. The new phase must replace those validation calls only, and it delegates acceptance to the same canonical snapshot stamp/lineage validators after auditing each selected snapshot and Store. Reader history still runs through `#stagePublication` and `publishAccepted`. The `#ownedProjectionValues` membership limits the private route to owned projection snapshots and excludes ordinary pinned snapshots without that provenance; it is not a reader-history receipt or a persistent phase permit.

`readOwnedClosedProjectionBatch` now catches TypeError only during external request normalization. Its private operation returns null only before Store pinning and observation. An exception after pinning propagates to the caller for discard, so B may map a null result to public-required only when its other pre-capture requirements hold. The private operation checks its receiver brand before reflection. No retry helper or transaction registry was added.

The tests cover own and prototype overrides, subclass fallback, Proxy receiver traps, stale removed and reinserted World cells, same-cut newer actions, two selected Store readers with separate accepted histories, Store prototype override, and revoked root epoch. Existing tests cover lane/accessor uncertainty and same-version source mutation. The new tests assert behavior, not audit counts.

The integration limit is material: these helpers only audit World and Store authority. They do not prove that Root props, metadata, code, resource, reader, or host callbacks are absent between phases. C must retain the public path wherever that complete interval lacks private provenance, and must call a fresh phase operation after each external boundary. No performance claim follows from the helper alone.

Suggested Luna commands after the primary review and full slice integration:

```sh
deno test --frozen src/owner_state_world_test.ts src/async_store_runtime_test.ts
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-owned-scalar-pipeline/verification/darwin-v1 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
```
