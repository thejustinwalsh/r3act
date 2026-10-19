# Proof-v2 one-shot pair

The authorized fixed-order Native-then-React pair completed with status `PASS_DESCRIPTIVE_RESOURCE_TRANSACTION_PAIR_ONLY` and command exit code 0. It used Node v24.18.0, headless Chromium 153.0.8010.12, GPU disabled, and offline replay of source-locked local assets. The harness recorded no blocked requests, request failures, page errors, console errors, or pair errors.

Both arms passed and produced the same defined output and SHA-256 `8e76a8a30f520f31570ceb3181667ed316d080f6a385c61f487632aae7523f0a`. The result includes selected outputs A/B, urgent Store value `7`, healthy independent health state, and one mount/cleanup for each fallback in both arms. `noEarlyPairReveal`, `urgentWhilePending`, and `healthWhilePending` were true in both arms. Native accepted one callback and disposed at version 4 with zero owners, zero pending changes, and zero remaining children. React disposed with zero listeners and zero remaining children.

The harness audited 762 source-lock entries before and after the pair with zero mismatches: 756 source inputs, one compiler, two transformed inputs, and three assets. The source-lock SHA-256 was `9ad976501c8d4bdd569d6440038195b449064931309320f7171f825fd185dc45`.

The single fixed-order settlement-to-first-matching-MutationObserver readings were Native 2.4 ms and React 287.5 ms, a difference of -285.1 ms (Native minus React). This pre-paint diagnostic includes scheduling and observer delivery. It does not identify CPU time or scheduler attribution and is not a performance qualification. It was not retried.

The harness closes its owned browser in its `finally` path. A subsequent escalated read-only process-table query found no remaining `chrome-headless-shell`, Chrome-for-Testing, Chromium, Playwright, Puppeteer, or `run-pair.mjs` process; the only matches were the query shell and `rg` process themselves. No process was stopped.

Raw structured result: `pair-one-shot.json`.
