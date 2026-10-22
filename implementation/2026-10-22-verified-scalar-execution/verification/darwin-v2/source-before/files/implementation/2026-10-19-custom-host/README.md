# Installed custom Canvas host proof

This bounded Unit 9 consumer copies the actual `examples/custom-host` application into a fresh project and installs five fresh `@r3act` tarballs. The consumer imports only public package exports. Its Vite config uses the installed native plugin and bundled Rust compiler. `build.mjs` archives source, tarballs, selected installed JS/types, compiler bytes and manifest, lock/config, compiled transforms and production assets before browser work. Each receipt is written in a new proof directory; failures remain inspectable.

The browser behavior run serves only hashed production assets through a synthetic HTTPS route. It starts no project server, runs headless without GPU, and stops after 90 seconds or interruption. The native application must keep one World/Store publication coherent across DOM, Three and the retained Canvas host; retain a keyed row's handle and local click count through a move; release the shared owned Brush only after its final binding; leave the borrowed Brush live until caller disposal; reject a stale removed handle; replace an owned Brush; draw actual 2D pixels; and finish with zero root owners, handles, resources and listeners. Canvas drawing follows the grouped publication's committed callback. The proof does not establish cross-renderer paint atomicity.

The separate comparison is a small control panel and 2D Canvas interaction. Each arm renders the same heading, button, count and colored rectangle from one local `useState` count. Native updates the public retained Canvas host from its button event; React paints its Canvas in a component layout effect. The browser checks initial and clicked DOM/pixel output before timing authorization. The paint scheduling and backend internals differ, so this comparison supports only a build/setup observation, not a runtime latency claim.

Use Node 24.18.0. The install uses pnpm's default store unless `R3ACT_PNPM_STORE` supplies a store path. After the primary's consolidated gate and package archive:

```sh
node implementation/2026-10-19-custom-host/build.mjs --proof-dir implementation/2026-10-19-custom-host/proof-v1
node implementation/2026-10-19-custom-host/run-pair.mjs --proof-dir implementation/2026-10-19-custom-host/proof-v1 --phase proof
node implementation/2026-10-19-custom-host/verify-browser.mjs --proof-dir implementation/2026-10-19-custom-host/proof-v1
```

Only after reviewing those untimed receipts may the primary write `run-authorization.json` with `status: "APPROVED_FOR_ONE_BUILD_PAIR"` and exact SHA-256 values for `build-proof.json`, `pair-proof.json` and `browser-behavior.json`. Then one `run-pair.mjs --phase measure` creates its receipt before any build, runs Native first in a fresh process, and requires matching transforms/assets/metadata and unchanged locked inputs. The interval is Vite process spawn to exit and may include warm caches. It is not runtime, CPU, memory, cold-setup, tails, or independent-device evidence. A failed attempt stays failed; corrections use a new proof directory.
