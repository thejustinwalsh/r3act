# Reusable World dirty journal

13 October 2026. This is a bounded storage change following the independently
verified native cell-cut timing failure. It does not have a new latency verdict.

## Change

`OwnerStateWorld` now uses an internal `WorldDirtyJournal` in place of recurring
per-owner dirty Sets. Owner buckets and site entries are reused while an owner
lives. Active intrusive lists preserve owner-major ordering and each owner's
site activation order. A cleared site or owner re-enters at its respective tail.
Destruction releases the exact owner's cache, including replaced incarnations.

World still performs the existing identity, liveness and captured-version
checks. Prepared private writes remain isolated; publication marks work at the
same points as before. Root queues, compiler emission, candidate publication,
props and public state APIs are unchanged.

Primary review rejected a proposed journal scan per legacy acknowledgement and
added direct membership lookup instead. A regression traps enumeration during
acknowledgement and verifies listener reentry keeps newer work pending.

## Verification

- Full Deno runtime suite: **582 passed, zero failed**.
- Rust compiler suite: **29 passed, zero failed**.
- Native tooling TypeScript check passed.
- Real Rust/OXC-compiled TSX numeric cell-cut execution proof passed, including
  sparse/dense updates, generic-capture traps and unsupported/mixed fallbacks.
- Existing forced-GC cell-cut retention proof passed with roots, hosts, dead
  setters and stable handles retained. This checks selected payload/target
  lifetimes; it is not a mounted-memory or general leak-rate measurement.
- Private package build and fresh installed consumer verification passed,
  including generated custom-host JSX declarations and compilation with the
  bundled Rust binary without Cargo in the consumer.
- Separate production build and six browser correctness pilots passed through
  Portless at `https://compiled-world-journal.localhost:1355`.

Nine primary verification commands are recorded in the checkpoint. Focused
agent checks preceded these; they are not substituted for the full runtime run.
The journal primitive also compares 600 deterministic randomized operations and
all owner/site membership checks against the former nested Map/Set model.

## Cost and limits

This trades recurring allocation/deletion for retained identifier/link metadata
and adds a 152-line internal module. Metadata stores no cells, payload values,
sources, handles or application closures; it persists until owner destruction.
The generic snapshot path still allocates records and iteration pairs. State
cells, maps, identity/version resolution and mixed-frame source batching remain.
This is neither zero allocation nor a whole-library size reduction.

The preceding candidate's paired median ratios were 1.71–1.88 native/React and
its speed gate failed. That result is archived in
`implementation/2026-10-13-native-cell-cut-timing/`; it cannot qualify this new
candidate. Production pilots here are correctness evidence only. Obtain current
CPU and allocation attribution before any further storage family, then use the
unchanged integrated timing gate for a speed claim. No release performance,
independent-device or human maintenance gate is closed by these tests.

See `world-dirty-journal-design.md`, `native-cell-cut-timing-findings.md` and
`performance-implementation-plan.md`. The overall implementation goal remains
active, and the full Sol review remains held under its existing prerequisite.
