# Diagnostic qualification boundary

Status: source prepared; no diagnostic execution by the implementation agent.

This isolated snapshot can identify the first false private admission guard during one actual Rust/OXC compiled DOM-and-Three joint transaction. It does not qualify correctness, throughput, latency, memory, or browser behavior. Its console instrumentation and extra filesystem copy alter execution conditions, so no timing from this run belongs in the product performance ledger.

The named guard wrappers evaluate each original operand once, retain the original short-circuit order, print only false predicates, and return the original boolean. An unlabelled earlier operand may still stop the expression; `preHost.specPrivate` and `mixed.vdomProgram` provide enclosing failure labels in that case. Generated source, emitted module, compiler proof, stderr, stdout, and any failure artifact remain in the snapshot workspace and logs.

`manifest.json` supplies product-before, product-after, and snapshot SHA-256 values for all copied files, plus the two symlink targets. A `productUnchanged: true` receipt proves that the source-copy preparation did not alter those product files. The symlinked compiler and dependencies are read from the pinned existing installation; their targets are not copied into the snapshot.
