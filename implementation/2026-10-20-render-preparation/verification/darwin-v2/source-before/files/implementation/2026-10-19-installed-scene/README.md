# Installed scene delivery

`prepare-build.mjs` consumes five fresh private-alpha tarballs from `scripts/build_r3act_packages.mjs`, installs them in a temporary consumer outside this checkout, copies `examples/installed-scene` unchanged, typechecks it and builds with the installed `@r3act/vite` plugin. It archives the raw example, comparator, tarballs, selected installed runtime package code and licenses, installed compiler, lock and transform outputs before recording production assets. The temporary consumer remains available for the reviewed comparison; it can be deleted after the proof closes. It does not alias runtime imports to the checkout or compile the installed Radix wrapper with React Compiler.

`verify-browser.mjs` replays only hash-locked production assets into a headless browser through request fulfillment. It never starts a server or reaches the network. Its 90-second deadline, owned browser close and one-run output prevent an unattended browser workload. It checks the example's documented `window.installedScene` controller, real DOM/Three snapshots, resource independence, keyed identity, native event, controlled Radix portal and disposal. Browser results are correctness evidence, not a timing comparison.

The sole bounded comparison is the `native` then `react` fresh-process Vite production build of tiny dialog-only entries with the same visible dialog labels. Run an untimed `proof` phase first. After source review, `measure` requires `run-authorization.json` with status `APPROVED_FOR_ONE_BUILD_PAIR` and the exact SHA-256 hashes of `build-proof.json` and `pair-proof.json`. The React consumer entry is transformed by React Compiler; the installed Radix wrapper is excluded. Prior untimed proof work and package installation may prime caches, so spawn-to-exit times are only one fixed-order observation. Bundle sizes reflect different runtime machinery, and neither arm is a full scene comparison.

Run after the consolidated package gate:

```sh
node implementation/2026-10-19-installed-scene/prepare-build.mjs --proof-dir implementation/2026-10-19-installed-scene/proof-v1
node implementation/2026-10-19-installed-scene/run-build-pair.mjs --proof-dir implementation/2026-10-19-installed-scene/proof-v1 --phase proof
node implementation/2026-10-19-installed-scene/verify-browser.mjs --proof-dir implementation/2026-10-19-installed-scene/proof-v1
# After review and exact authorization:
node implementation/2026-10-19-installed-scene/run-build-pair.mjs --proof-dir implementation/2026-10-19-installed-scene/proof-v1 --phase measure
```

Use a new proof directory for any source repair. Preserve a failed directory and its logs. These commands require Node 24.18.0 and local installed dependencies; no server is needed.
