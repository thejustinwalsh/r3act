# 17 October 2026 matched-pair preflight

Status: **NOT RUN — optional comparison skipped at environment setup.** No server, proxy, browser page, route, or trust-store change was made.

The checkout was clean at commit `8a7b4f6`. The intended observation was one descriptive matched pair at 1,024 homogeneous rows, all dirty and contiguous, with the existing collector's 60 warmup and 240 measured frames per arm under its 90-second total deadline. The pair would have been Native versus React Compiler using the existing v4 production dist and correctness checks. A single pair is descriptive only and cannot qualify a speed claim or resolve the master plan's multi-pair gates.

Existing build proof: `implementation/2026-10-16-publication/verification/performance-build-v4/build-proof.json`, SHA-256 `421066aa06d1f683ef47c76ef43a79f28259a673dfd93b1dad6bcc990bec969e`. The frozen dist assets are under `implementation/2026-10-16-publication/verification/performance-build-v4/dist/`; the source/build inventory is `implementation/2026-10-16-publication/verification/final-source-build-inventory.json`. Existing collector/protocol reference: `.cache/headless-high-frequency-qualification-stage/collect-one-pair.mjs`, `study-spec.mjs`, and `protocol.md`. These files and historical manifests remain unchanged.

Read-only preflight found no `portless` executable or `~/.portless` state, no listener on proxy ports 443 or 1355, and no active Portless/Vite preview process. The installed `vitexec@0.9.0` resolves to an accessible Playwright Chromium binary at `/Users/mini/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Portless upstream metadata reported version 0.15.8, but it was not installed. Because a trusted HTTPS route requires installing and provisioning a local Portless CA, and the user explicitly made this comparison optional, setup stopped here.

The evidence does not change the pre-existing correctness/build results. No runtime measurement exists for this commit; no performance conclusion follows.
