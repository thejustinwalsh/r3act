# Retained-child Store clock results

This integrated slice adds finite Store schema6 for closed numeric/aggregate wrapper props with one direct retained child, uses existing Store projections and owner-qualified VDOM prop deltas, and enables eligible closed Store cuts during ordinary resource-free flush. Three workbench authoring now has one separate canonical frame Store and one RAF dispatch instead of per-owner setters. Child bodies receive no purity claim; existing history/publication/lifetime and generic fallback remain. [Design](design.md), [primary review](source-review.md), [protocol](protocol.md).

## Preserved failures

- Initial environment argument ordering fails before Python starts, tool exit127; no supervisor/product command starts. [Launch record](verification/darwin-v1-launch-attempt.json).
- [Darwin-v1](verification/darwin-v1/receipt.json):63/68 phases pass, four failures and one dependent skip. TS7022 blocks tooling/package and Deno also has TS2367, so Deno executes no tests. Fixture48 sees two wrapper renders rather than zero. Rust93 and compiled1–47 pass; sourceAudit MATCH.
- [Darwin-v2](verification/darwin-v2/receipt.json): same phase result. TS2367 is fixed; node annotation does not fix the child inference error. Distinct component keys do not alone enable the ordinary path. Deno still executes no tests; Rust93 and compiled1–47 pass, sourceAudit MATCH.
- Primary traces the ordinary closed-Store eligibility restriction to live resource subscriptions. It is removed while retaining other guards; the exact child local receives its explicit type. [Darwin-v3](verification/darwin-v3/receipt.json) passes67/68 phases:1113 Deno tests pass and one new negative-test setup fails because schema1 Child uses unsupported x prop metadata. Rust93, all48 actual compiled fixtures, tooling and fresh package checks pass; sourceAudit MATCH. The test is corrected to the already supported position-x property, without relaxing admission.

The repeated-key authored fixture also required distinct component keys under the same native component owner, while returned intrinsic host keys remain identical to test owner-qualified lookup. Native host parents do not currently create distinct component owner scopes; that separate compatibility/identity seam remains open and is not fixed by changing the fixture.

## Current boundary

Source verification continues in a fresh namespace. No installed application proof or performance run has occurred for this slice. The prior local-cell/polynomial workload differs from this shared-clock/retained-child/linear-prop workload, so no old timing is inherited or causal saving inferred. Full-plan speed/cold/memory/independent-device and HMR requirements remain open. Historical narrow wins, qualified dense FAIL, exhausted Recording A and physical HOLD remain.
