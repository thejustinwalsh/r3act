# Committed-cell identity registry removal stage

Scope is isolated to `proposed/src/owner_state_world.ts`; the live `src/owner_state_world.ts` was not edited. The staged source removes `CommittedCellIdentity` and `#committedCellsByIdentity`, including registration/deletion sites and the dead stored handle. `CommittedCellCapability.resolveLegacyChange` reuses the existing opaque capability authority. It checks object/function and private brand, checks the World secret, captures the cell reference, then reads the legacy change address in the former owner/site short-circuit order. Callers retain the old `#assertOwner` step for a matched identity and the existing scalar/version fallback for a miss.

The public `StateCellHandle` and direct handle resolver are unchanged. Owner destruction still revokes the capability before clearing payloads and still clears each cell's identity/handle fields. No new persistent records, maps, or flags are introduced.

## Parity details

`proposed/src/committed_cell_registry_parity_test.ts` imports a byte-identical pre-edit World copy and the proposed copy. It compares results, thrown outcomes, getter counts, and getter event order for matching identities, foreign and proxy identities, malformed primitive identities, owner/site mismatches, throwing getters, and reentrant owner destruction. Separate cases verify truthy identity double-read, falsey single-read, zero proxy property traps, and a capability from a different World.

The paired baseline test uses `--no-check` because both separate World module URLs import the project's global JSX declaration, which Deno reports as duplicated; the parity tests themselves execute against both copies. All staged behavior suites are separately run under the normal strict type-checking path.

## Verification

- Staged strict Deno suite: `deno test --config deno.browser.json --frozen` over `state_change_resolution_test`, `owner_prepared_identity_test`, `state_change_identity_test`, `direct_cell_capability_test`, `native_cell_channel_test`, `native_cell_cut_test`, `native_root_cell_queue_test`, and `pending_state_cells_test`: 51 passed, 0 failed.
- Old-versus-staged resolver parity: same config and `--no-check`: 4 passed, 0 failed.
- Dead-setter payload retention: Node 24.18.0 `--experimental-transform-types --expose-gc` against the staged World: PASS for committed and published-candidate setters.

This is a bounded correctness/retention check. It does not establish a warm-path speedup.
