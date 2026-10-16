# Compiler-known numeric state lanes

13 October 2026. **Correctness-qualified candidate; speed unmeasured.**

This follows the prepared-style candidate's verified speed failure at every
registered size. It implements the first integrated M5 path using the existing
compiler, owner lifecycle, numeric columns, retained VDOM, and host writers.
Authored code keeps ordinary `useState` and JSX; there is no author-selected
backend or performance flag.

## What changed

The Rust/OXC compiler's optional state-layout descriptor gives supported unary
prop-only state sites dense slots in authored hook order. Root passes the
validated, immutable descriptor to every active owner render. World groups
those cells into per-descriptor numeric columns and owner rows. A lane-backed
cell's logical value lives in its Float64Array row. Generic and candidate state
remain plain writable objects; only committed lane activation installs the
shared value accessor. ScalarSource compatibility mirrors remain separate from
the logical state. Warm lane setters reuse their cached slot and address.

Candidates keep private boxed values and layout intent. Publication installs
lanes after owner slots are installed. Discard and rollback cannot overwrite
committed columns. Promotion to a nonnumber retires the lane and stays on general
storage; the JSX helper evaluates the authored projection on that value.
Returning to numbers can use the existing scalar program, but does not undo
sticky promotion. Owner destruction clears values and source references, retires
rows, and invalidates exact captured handles. Reused rows have new generations.

For a wholly eligible numeric cut, Root resolves captured handles and versions
to exact live addresses and fills reusable column/row/value buffers. VDOM maps
existing unary writers to these addresses, stages every explicit captured value
and projection before host writes, and acknowledges only a supported successful
cut. Preflight decline is distinct from a supported unchanged result. Newer
reentrant versions stay queued. Host failure remains terminal at Root. Disposal
inside a writer clears the captured buffers and owned state.

Structural binding refresh keeps associations. Removal prunes only the sources
whose last group detached: a 96-source regression records zero prune visits for
one refresh and exactly one for one removal. Full rebuild still has global work.

## Primary evidence

- Full runtime suite: **629 passed, 0 failed**.
- Rust compiler suite: **32 passed, 0 failed**.
- TypeScript native-tooling check: passed.
- Actual compiled TSX layout and lane-cut proof: sparse/dense cuts of one and
  six cells; zero generic numeric snapshots and zero scalar-program calls for
  those supported cuts; correct styles, keyed move, removal, generation reuse,
  and private candidate discard.
- Actual compiled TSX lifecycle proof: captured reentrant values, string and
  undefined promotion, numeric fallback, initializer persistence, ref/effect
  ordering, stale setter cleanup, and terminal host failure.
- Primary Root regression covers disposal during an active lane writer and
  verifies all three retained capture arrays have zero length afterward.
- Existing compiled scalar/compound/direct-style proofs still pass, with 73
  prepared-writer factory activations and 80 writes.
- Existing payload/target GC probe passes. It is a narrow lifetime proof, not
  allocation-rate or mounted-memory evidence.
- Package build and fresh consumer verification pass; production build and all
  six real DOM product pilot pages pass correctness and teardown.

Twelve final primary command logs are recorded with the candidate. This is a
narrower qualification set than the older complete release matrices; it does
not imply those matrices were all rerun.

## Limits and next decision

The first layout proof is unary only. Compound sinks, unproved state, promoted
state, and mixed store/collection updates retain established fallback paths.
Mixed numeric writes still join the existing coherent candidate host phase;
they do not use the new lane-cut writer after publication. Cold activation adds
column/address/index bookkeeping and capacity that must be measured. This
candidate has no fresh performance or allocation result. Fewer lookups, passing
counters, and smooth-looking pilots cannot establish that it beats React.

Freeze source/build and proofs, then run the same 30-page registered workload:
.80 paired median ratio at two sizes, 1.10 paired p95 ratio at every size, equal
isolation headers, fixed clock-resolution rule, no exclusions or replacement
pages. Preserve any failure. Independent-device and human maintenance/adoption
gates remain open. The held Sol review remains held; easier complete R3F
maintenance has not been demonstrated. Workers, streaming, hydration and Wasm
remain deferred.
