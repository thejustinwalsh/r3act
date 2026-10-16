# Preserved draft before primary full-patch corrections

This directory copies the five changed snapshot source files, new probe module, README, manifest, patch, self-check, and three source hash lists from the first prepared handoff. The other 253 unchanged snapshot files are represented by the preserved before/after hash lists and remain in the current snapshot; no second giant source copy was made. The original draft SHA-256 values were: `source-patched.sha256` `34e2b946083a2d89cee63d2ed9ce01328086ef6a61f31024fe979469dec8b7e2`, `snapshot.patch` `b118ab2c2fdeb069ce37b40de522227c464c324a7446a404125548fbb8b5d155`, and `probe-manifest.json` `0dd7c63a0c2ff34a46d9cccba28a6287dfc19db8a45b90229742d6329d4e3192`.

This attempt was never tested or built. Primary review found the release counter at `applyProps`, an extra `host.dispose` getter read, and silent invalid amount handling. The current sibling files repair those issues; this attempt remains archival only.
