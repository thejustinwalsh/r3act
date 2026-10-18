# Direct root intent diagnostic

Status: **PREPARED; NOT BUILT OR RUN.** This is one bounded, descriptive pair for the pending direct `root.update(newTree)` intent slice. Correctness gates and primary review precede any collection.

Both arms first accept an initial Suspense primary with a host `div`, a value, and button state incremented to one. Native then dispatches a pending Promise into an explicit versioned `createStore` and calls `root.update` twice, first with an obsolete label/resource and then with a latest label/resource. The component reads its requested resource before `use(use(controlStore))`; the pending control also blocks re-expansion of the previously accepted primary. React makes the two corresponding `startTransition(() => root.render(...))` requests with a pending control Promise passed as a prop. The two requested resources are distinct. After two frames, the obsolete resource settles outside the timed interval; after two more frames, both arms must still show the original host, value and state, with no obsolete label or fallback flash. The latest resource and control settle synchronously in one task.

Timing begins immediately before final settlement and ends at the first `MutationObserver` callback where the latest label and value match. The completion observer records that timestamp before checking computed visibility, so the collector's layout reads do not precede it. The interval includes scheduling and observer delivery, and ends before paint. The page checks host identity, local state, computed visibility through ancestor elements at initial/pending/obsolete/final phases and mutation callbacks, final normalized output digest, no fallback/obsolete flash, and balanced disposal. Mount, disposal and a timer-quantum floor are reported separately. This is one manual settlement-to-observer observation per arm, not CPU, paint, tail latency, network, general transition performance or visual atomicity. The control input is an explicit dependency in both arms, not an untracked global or evidence that unrelated resources drain independently.

`build-gate.mjs` creates an exclusive proof directory and freezes the benchmark, repository runtime/compiler/tooling inputs, and native compiler binary before building. Vite uses the repository Rust/OXC native plugin for `native_arm.tsx` and the installed React Compiler plugin for `react_arm.tsx`. The gate inspects actual transformed component registration, hook and boundary-site lowering, authored direct updates and transitioned React root renders, module revision evidence, and React memo/runtime output. Debug JSON is not treated as compilation proof. It hashes produced assets and rechecks all locked inputs after the build. The primary must review this captured proof and write `run-authorization.json` containing `{"status":"APPROVED_FOR_ONE_DESCRIPTIVE_PAIR","buildProofSha256":"<sha256 of build-proof.json>"}` before collection.

From the repository root, after the primary releases the slice, Luna can use a unique new directory below this benchmark folder:

```sh
NODE=/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node
PROOF="$PWD/implementation/2026-10-18-direct-intent/benchmark/proof-v1"
"$NODE" implementation/2026-10-18-direct-intent/benchmark/build-gate.mjs --proof-dir "$PROOF"
# Primary reviews build-proof.json, then writes the hash-bound run-authorization.json.
"$NODE" implementation/2026-10-18-direct-intent/benchmark/run-pair.mjs --proof-dir "$PROOF" --origin https://direct-intent-proof.localhost
```

The runner uses headless Chromium with GPU disabled, a 1200×900 viewport and a hard 90-second interruptible deadline. It replays only exact source-locked production assets at a synthetic HTTPS `.localhost` origin; every other request is aborted and fails the pair. There is no project server, proxy, external network request, trust change, warmup, filtering or retry. It records incomplete attempts and refuses to replace an existing one-shot receipt.
