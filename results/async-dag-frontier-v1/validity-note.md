# V1 validity note

The 30 raw page blocks in this directory are preserved as collected, along with their preregistration and schedule. This run is invalid for the preregistered pending-view and DOM-identity claims: the initial React Suspense boundary was not awaited before the first measured arm, so 20 blocks sampled a visible loading fallback and reported replaced/hidden nodes. Do not pool these records with V2 or use their pass count as a result. V2 adds an initial layout-commit barrier, freezes a new protocol and build hash, and recollects all 30 blocks from scratch.
