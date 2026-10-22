# Primary integration review — source freeze

The prior structural-owner slice is complete at 9ef7ac1. This unit implements compiled numeric Store computation and contiguous main-thread range execution; it does not reopen that slice's diagnostic work. No current-unit gate, build, browser or performance workload has run.

## Compiler seam reviewed

The focused Rust emitter accepts numeric inputs, finite number literals, numeric unary operators and arithmetic/bitwise binary operators. It declines aggregate, logical, conditional and subtree outputs. This deliberately conservative subset matches the TypeScript kernel normalizer. Schema 6 keeps its retained child outside the numeric host output. The unchanged host program remains the fallback and differential oracle.

The DAG change introduces an explicit flat-input/all-output lowering mode. Existing owner-row consumer masks remain on their original route; no fake row objects or duplicated CSE implementation are introduced. Generated code uses row-major scalar offsets and returns the exact scalar count. Executable registration and descriptive metadata derive from the same host program and revision; the revision input includes the new compiler semantic ABI discriminator.

## Runtime seam reviewed

The source stages kernel results through the existing StorePropDelta/cache path and retains current/publication checks. Consecutive same-kernel owners share cut buffers. Admission requires exact existing reader membership for each input and canonical private Store branding; resource and legacy rows flush the pending run before their capture. Canonical capture reads owned projected data and existing snapshots without invoking authored reducers or selectors. No accepted-history, identity or persistent dependency registry is added.

Review caught a multi-use owner deduplication gap while rows await execution. The fix reuses the existing covered-reader set; a two-Store owner regression requires exactly one output row. Scratch output values are copied into immutable primitive prop pairs before later runs, so redundant per-scalar property descriptor writes were removed. Current-range own-slot, finite-value, exact count and length checks remain. Scratch buffers clear on release/failure.

The actual Rust/OXC fixture checks metadata/revision, flattened lexical paths, prop order, numerical equivalence including signed zero, nonzero offsets and sentinel preservation. Authored A,A,B,A owners require three original-order runs; retained state/events/Three resources, fork history and opaque fallback are covered. Focused runtime source adds old-metadata fallback, stale revision, newer reentry, nonfinite output decline and multi-use dedup. Publication/partial-host failure authority is unchanged; the existing consolidated suite exercises that shared authority. A second bounded compiler/runtime source review found no additional mismatch.

## Remaining boundary

Source is frozen for Luna's consolidated correctness gate. Installed proof must precede the sole bounded comparison. The fresh consumer preserves the prior shared-clock authoring and React/imperative arms, including alternating motion programs; no reorder is made to lengthen runs. No speed saving, phase share or full DAG fusion is established by source review.

Darwin-v1 exposes two observation/setup errors. The interpreted Other host's parent accidentally shares its raw key, so the test now gives that parent a distinct key while preserving component identities and the A,A,legacy,A sequence. Early closed-Store flushes precede the old counter-map initialization; initialization now occurs for that eligible early attempt, and later paths preserve its map. Profiling-disabled runs allocate no counter map. Compiled routing assertions remain exact. Both changes were source-reviewed before a fresh consolidated gate; the first failure receipt remains unchanged.
