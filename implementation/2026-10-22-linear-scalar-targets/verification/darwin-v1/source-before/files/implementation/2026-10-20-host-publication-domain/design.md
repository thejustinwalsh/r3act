# Shared host publication domain

Source basis: `3b6303d3ec52906b1eb67611e94a9fc7eab1f084` on local main. This is a semantic implementation of master-plan §5 and §17, not a physical performance selection. Recording A remains exhausted and physical redesign remains on HOLD.

## Replaced mechanism and authority

Root-local application depth and individual queue locks currently permit a writer in one root to synchronously publish another root sharing the same host object. Distinct NativeRootWorkQueue instances do not share those locks. A writer may then throw after the other root has advanced accepted history. Replace that admission gap with one WeakMap keyed by the existing host object, holding its opaque application claim, failure and waiters. Retain root-local lifecycle barriers and existing candidate, identity, version, action and accepted-history authorities; do not create a second version or root registry.

The exact VDOMHost object is one owning publication domain. Multiple containers and roots may share it. Distinct host instances remain independent outside an explicitly failed group; the existing queue policy conservatively terminates every member of a partially failed group. There is no partition API in this slice. Host resources, event dispatch and custom writer state may be shared even across distinct containers, so container identity alone does not prove independence.

## Required semantics

Claims cover host application through accepted publication, including a public standalone candidate paused between commitHost and publish. Discard remains legal only before host application; a post-host candidate must publish or fail. A native group acquires all required host domains without callbacks, all or none, and supplies one opaque claim to every same-host candidate. Public validation callbacks run before final admission. Domain contention is transient preapplication pending work; it must not be reported as partial failure or cause an immediate stale retry loop. Release wakes waiters asynchronously after the holder finishes its critical region.

Direct mount, update and flush on a different root defer before unknown component bodies/readers when its domain is held. Preserve the latest direct intent, chronological actions, resource interests and wakes. Same-root barriers retain their existing contract. Disposal revokes eligibility promptly and serializes physical teardown after the active application. A suspended preparation does not hold host application authority, so unrelated ready domains continue.

After successful grouped writes, all managed accepted pointers and exact acknowledgements advance before notifications. Reentrant newer actions remain pending and forked roots retain their own accepted histories. A partially applied host failure quarantines that host domain; other roots cannot publish into the same damaged host. Teardown remains possible, and recovery uses a fresh host. Generic fallback, resource lifetime, compiler revisions and whole-tree/cache guards remain intact.

Arbitrary setters may observe intermediate physical mutations. Direct adapter mutation outside the publication API remains outside this contract. This establishes neither arbitrary mutation rollback nor cross-renderer visual atomicity.

## Verification boundary and falsifiers

At the integrated boundary, run one consolidated correctness gate, fresh installed public-package controls and one bounded matched Native/React comparison. Preserve every failure. An isolated immutable old-source characterization may establish the nested-write defect; it is not a timing qualification. No per-helper benchmarks, server, VM startup or memory increase are needed.

Falsifiers include nested same-host application across roots/queue instances, opaque work running before a busy domain is released, busy work quarantining a healthy host, a claim leaking on discard/failure/disposal, a same-host group deadlocking itself, new accepted history after a partial host failure, lost newer actions, premature shared-resource release, or unrelated distinct hosts waiting on each other. Tests must cover standalone candidate pauses and pre-host discard as well as direct and grouped paths.

No measured savings budget exists for this correctness mechanism. Added admission/setup/retention costs remain unqualified until the bounded comparison, which cannot establish universal speed or release qualification. Release median/p95, cold/memory, current other-platform and independent-device requirements remain open; no maintenance advantage is claimed.

## File ownership

- Primary: design, platform-runner integration, installed controls, evidence review and checkpoint.
- Sol medium completion_contract_check: `src/component_state_runtime.ts`.
- Sol medium host_publication_domain: shared domain module and both root work queues.
- Sol medium async_ux_collector: new root tests, compiled fixture and public authoring/Three reference.
- Luna: consolidated execution only after primary source review; no concurrent implementation-time gates.

Memory policy: saved Apple defaults remain one CPU and 256 MiB/container, 512 MiB/build. Service startup and effective caps remain unverified; no automatic increase is authorized.
