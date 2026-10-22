# Compiled numeric Store kernels — verification in progress

The compiler/runtime/fixture implementation is integrated. This is not a completed or performance-qualified slice. Existing qualified losses and narrow historical wins retain their original scope.

## Preserved first consolidated gate

Darwin-v1 executes all 70 phases and fails 68 PASS / 2 FAIL, supervisor exit 1, stop null, 146.45 seconds. Source audit matches all 1580 before/after input hashes. Rust passes 98 tests; actual compiled fixtures 01–49, package build/consumers, Three and retention phases pass.

Deno executes 1132 passing tests and one failing new mixed-range case: `root.prepareStores([clock])` declines before host writes. Source review identifies a test collision: the legacy interpreted Other host and its parent both use raw key `other`; the unowned schema-1 delta correctly declines ambiguous global lookup. The correction changes only that parent host key, retaining the mixed owner sequence and all component/kernel identities. Compiled fixture 50 completes its direct metadata/offset/oracle checks but fails its first integrated routing assertion: kernel run count is undefined instead of three for authored A,A,B,A owners. The fixture does not complete and supplies no integrated PASS. Its early closed-Store flush can precede counter initialization, so missing counters alone do not establish generic fallback. That lifecycle is under review. No assertion is weakened to accept fallback.

Source review confirms the counter lifecycle cause: the successful early closed-Store attempt can return before the old counter initialization. Counters now initialize at that eligible early attempt and survive into later paths when needed, without allocation when profiling is disabled. Neither the compiler ABI nor runtime range execution changes in this repair. The exact compiled routing assertions remain.

Raw logs and step receipts are under [darwin-v1](verification/darwin-v1/receipt.json), with the terminal [supervisor](verification/darwin-v1-supervisor.json). No installed proof or timing has run. The failed gate remains immutable; repaired source is frozen for a fresh consolidated receipt.
