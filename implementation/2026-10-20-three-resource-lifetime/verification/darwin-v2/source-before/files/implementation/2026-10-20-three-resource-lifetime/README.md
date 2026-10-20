# Three resource lifetime slice

Shared resource handles now keep host-owned geometry/material live through their final alias, while borrowed-only assets stay caller-owned. Cleanup and creation reentry preserve ownership and errors. See [design](design.md), [primary review](source-review.md), [installed protocol](protocol.md) and [public reference](../../docs/three-host-reference.md). The immutable baseline characterizes old defects; final verification and evidence limits are recorded at the completed boundary.
