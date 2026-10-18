# Source review before the consolidated boundary

Primary and a Sol medium reviewer inspected the working runtime and compiler fixture without executing gates during implementation. These findings are source-grounded; correctness results belong to the later frozen gate receipt.

- The old exact-one-target shortcut consumed multiple settlement invalidations, then an unrelated pending sibling could block their generic publication. Fresh independent receipts must drain eligible targets from the existing workset.
- Declined targets and interrupted captured targets must survive a blocked generic retry. Restoring them must not schedule an immediate retry loop. A postpublication error cannot undo an earlier accepted sibling; a partial host error quarantines subsequent writes.
- The existing generic resource-retry branch acknowledged captured World/root changes even when no generic publication occurred. Acknowledgement must depend on that generic receipt advancing, independent of earlier sibling publications.
- A prepared candidate needs discard on validation/prehost failure; cleanup must preserve its primary error through the existing aggregation helper. Published/failed lifecycle states already make discard safe.
- `Object.isFrozen` does not exclude accessor properties on hand-authored RuntimeElements. Closed admission must capture own data descriptors for child/fallback type and props, decline ordinary accessors without invoking them, and validate controlling identities again. Proxy traps remain user callbacks; no purity or rollback promise follows.
- DOM descriptions must reflect actual setter branches and decline arbitrary property setters, subclass overrides, instance overrides/accessors and replaced base methods. They never change execution or authorize scratch reuse.

The compiled fixture uses actual Rust/OXC closed programs for B/C and shared resource handles across two independently accepted roots. Logical VNode keys are not host properties; identity assertions retain actual mounted nodes. The paper/notebook continuation refers only to previously verified `ffd0af9`; its appended Markdown must leave every earlier cell/output and notebook metadata unchanged.
