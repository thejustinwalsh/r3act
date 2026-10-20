# Installed authored lifecycle

This carries the existing 256-row, 60-update application into fresh installed packages with separate Native and React code graphs. It preserves the generic keyed edit, local state, two independent resource reveals and exact lifetime assertions. The Native arm and shared contract retain their old bytes; the React arm changes only two obsolete declaration comments and its explicit JSX-source pragma, with exact adaptation checks. Historical source/results are unchanged.

Read [design](design.md), [browser protocol](protocol.md) and [consumer](consumer/README.md). No source alias, consumer Cargo build, project server or VM is used. Packages remain unpublished private-alpha artifacts. The existing full compiled Memory-host application fixture covers the same Native body; the installed browser protocol covers actual package and entry integration.

After primary source review, Luna runs the consolidated frozen platform gate and fresh package build, then prepares an absent proof directory:

```sh
node implementation/2026-10-19-installed-lifecycle/prepare.mjs --proof-dir "$PWD/implementation/2026-10-19-installed-lifecycle/proof-v1"
```

Primary reviews `input-lock.json`, `build-proof.json`, actual Native and ReactRow compiler output, all frozen-body adaptation and separate-graph assertions. Then run the complete untimed episode:

```sh
node implementation/2026-10-19-installed-lifecycle/verify-browser.mjs --proof-dir "$PWD/implementation/2026-10-19-installed-lifecycle/proof-v1" --phase proof
```

The [protocol](protocol.md) specifies exact primary hash-bound timing/heap authorization fields. Timing is exactly one Native-first fresh-page interaction pair, with every inspection and frame wait outside dispatch-through-commit intervals. Heap is one separate untimed forced-GC pair after timing. The scripts refuse to overwrite a phase. Failures retain original receipts and logs; there is no favorable timing retry.

This supplies a current installed cost view, not a new easier release gate. Fresh application mount follows module loading; it is not OS, filesystem, network or browser cold start. Within-page median/p95, integrated proof-build wall clock and signed whole-page heap/DOM deltas do not qualify population tails, allocation attribution, leak absence, retained-memory budgets, physical presentation, general React superiority or independent hardware. Prior Native losses and historic narrow wins retain their own source scope. Full-plan and physical-selection limits remain in the master guide.
