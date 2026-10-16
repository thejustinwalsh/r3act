# Preserved retry 2 build before native ID alignment

This directory preserves the exact successful retry 2 tooling, snapshot, source manifest, production build, and build lock. Luna's gate logs and file inventories are in `../../tooling-gates-retry2/`. The build-lock SHA-256 is `d244caa769f41601cd7d0e9d20b0f87d32bfb68ede23c6f9ac58bb9578fc6486`.

The diagnostic native compiler root resolved to the snapshot root, producing component, program, state-site and sink IDs prefixed by `.cache/high-frequency-harness-stage/`. The frozen build04 IDs are relative to that stage and start with `src/browser/`. This build passed its original gates, but it is not the pre-pilot recording build. Retry 3 changes the diagnostic config root to the stage and adds exact native identity comparison to the build lock.
