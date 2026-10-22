# Prototype-audit ablation diagnostic

This is a single, bounded mechanism diagnostic over the already-installed `proof-canvas-v3` assets. It does not edit product source, rebuild assets, start a project server, qualify performance, reopen the parity result, or estimate a removable-time budget. The existing eight-context CPU-sampling study and its raw files remain immutable.

The sole ablation is deliberately unsound: in a disposable copy of the frozen Native JavaScript bundle, replace the body of the unique `closedNumericPrototypeIsCanonical()` declaration with `return true`. This disables every effect of that helper, wherever called, and changes JIT behavior. It does not isolate only frame publication. Interpret the result only as a discriminator for whether this helper is a plausible contributor to the previously observed Native/React mechanism difference. Never describe the ablated cohort as a faster implementation or use its delta as a product budget.

Before any workload, the runner verifies the frozen v3 build proof, input lock, reviewed-source-v7 manifest, all selected Native and React consumer inputs and assets, 585 current `src/`, `compiler/`, and `packages/` source hashes, the browser executable, and browser-tool package files. It requires local headless Chromium (`SELENIUM_REMOTE_URL` absent), offline intercepted synthetic HTTPS, and the common GPU renderer. It hashes the driver and this protocol before and after execution. This is a bounded product/runtime and tool lock, not a whole-worktree lock; current research/documentation context has advanced since v3 preparation.

The source rewrite must match the frozen Native bundle hash and one exact declaration. The runner preserves the declaration signature and every byte before and after the body, pads each body line with spaces to preserve line breaks, source offsets, total bundle length, and all later byte offsets, and records the original and replacement body text plus copy/function/body/diff hashes and offsets. It writes only under the fresh output directory and re-hashes the copy after the study. The one exact Native bundle URL serves the disposable copy in the ablated contexts; every other URL and every control context serves the original frozen asset bytes. The original bundle is re-hashed in every source check.

The six fresh contexts run in this exact order: Native original, declarative React, Native audit disabled, Native audit disabled, declarative React, Native original. Every context uses the unchanged 12 warmup plus 60 measured updates, null diagnostic counters, and the same value/pixel and resource-lifetime oracles. The runner requires matching output digests across all six contexts, the expected renderer, 512 resources disposed exactly once, cleanup to zero retained scene children and registered setters, no page or console errors, no failed or unexpected requests, and closed browser contexts. Any failure is preserved in the receipt; there is no retry or variant.

The internal deadline is 120 seconds; invoke it with a 180-second supervisor. A representative invocation after primary review is:

```sh
python3 implementation/2026-10-20-closed-collection-rows/run-bounded.py \
  implementation/2026-10-22-react-mechanism-research/verification/prototype-ablation-v1-supervisor.json \
  180 \
  /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-react-mechanism-research/run-prototype-ablation.mjs \
  --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-frame-publication/proof-canvas-v3 \
  --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-mechanism-research/runs-prototype-ablation-v1
```

The supervisor receipt and output directory must be absent before the approved one-time execution. Preserve every raw context result and failure. The only valid conclusion is diagnostic: whether the all-effects-disabled Native helper changes behavior or reported wall controls under this exact workload. Wall deltas remain noisy controls, not causal savings. Even a large ablation delta cannot establish that the prototype audit is removable or that a semantic replacement is safe.
