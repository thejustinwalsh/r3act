# Native and React HMR integration review

Source basis: main `8dd4503a09727de1ef4e123e368ce9b04af06a54`. The preceding goal turn completed accepted error recovery. This unit continues master-plan compiler/adoption Units 3/8/9. Full-plan completion remains active. Recording A is exhausted/unresolved and physical selection remains HOLD.

Primary regrounding reread AGENTS, checkpoint and complete guide, handoff/research guide and relevant HMR paper/notebook evidence. Existing HMR records cover historical development remounts; they do not prove current installed-package behavior. Current source remains the authority.

## Replaced mechanisms and contracts

The root Vite configuration previously used a filename regex to keep native modules out of React Refresh. The public composition helper now discovers native sources within declared source roots before constructing React plugins and passes exact path exclusions through supported React/Vite options. It retains caller exclusions and node_modules isolation. Native-only Vite imports must not require React or plugin-react. Static source discovery has startup cost; no speed budget or advantage is assumed.

Native membership changes require conservative Vite restart so source exclusions and OXC/Babel filters agree. A mismatched transform must fail safely rather than enter the wrong renderer pipeline. Native edits retain revision-stamped invalidation before conservative full reload. Importer/reexport traversal respects Vite self-accepting React boundaries; unresolved helper changes still invalidate affected native importers. Uncertain native hook correspondence never preserves old state.

The existing semantic-plan registry remains the revision authority. An obsolete event must not revoke a newly evaluated revision. Root invalidation must cover accepted, pending and prepared code references while leaving unrelated known roots live. The existing prepared-candidate authority carries lazy code predicates instead of a second version registry or eager per-preparation cache scan. Unknown public tree shapes must not become empty code provenance.

Retirement revokes preparation immediately, then releases task/queue/resource/Store/collection/effect interests after any active host/publication batch. Accepted host state stays caller-owned until dispose/remount. Retirement callbacks and deferred disposal must both run even if another cleanup throws, preserving original host errors. Exact acknowledgements, newer actions, per-root history, writer identity, partial-failure quarantine and full-tree guards remain.

## Execution boundary

Sol medium agents own compiler integration, runtime lifetime and installed consumer/harness separately. Primary owns public package consumption, root configuration, gate registration and checkpoint. Implementation agents run no tests/builds/benchmarks. Luna runs the consolidated correctness gate after source review; exact installed transforms and headless behavior precede the sole matched build observation.

The installed browser workload uses actual fresh public tarballs and a consumer outside checkout, without aliases. It must distinguish React Refresh retention from native reload/remount policy, preserve revised source and WebSocket/cleanup evidence, and stop only owned server/browser processes. A build pair uses equal small Native/React authoring rather than treating full reload and Refresh as equivalent latency workloads.

AGENTS requires loading `portless-dev-servers` before any project server. That exact skill is absent from the configured machine roots; the primary asked the human whether to use the official upstream Portless skill. No server or Portless process is authorized to start until that choice arrives. Source implementation and offline gate/build work can proceed independently. Browser runs must be headless, bounded, interruptible and GPU-off; every server uses Portless HTTPS.

No VM or memory cap increase is needed. Saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/builder; startup/effective limits remain blocked/unverified by Depot launch permissions. Host memory/cold/memory-performance, presentation, independent-device and human maintenance requirements remain open. Existing timings do not qualify this changed source.

Status: primary source review complete; released to the consolidated offline gate. The shared lifetime finalizer independently attempts revision retirement and deferred disposal while preserving the host failure. Installed browser conformance and the matched build pair remain unreleased; no current correctness/build/browser/performance claim.

The first runner launch failed before commands because its parent verification directory was absent; its receipt is preserved separately. Darwin-v1 then reports 36 passed, three failed and one dependency skip, with all 928 source inputs unchanged. Both plugin tests, all 24 compiled fixtures and the two source proofs pass. Deno/tooling/package gates reject a retirement-listener Set passed to an array-only helper and an unjustified generic React-options cast. The fixes preserve the listener snapshot and express the actual options contract; no assertion or runtime fixture is weakened. The failed gate remains immutable.

Darwin-v2 passes 39/40 steps with unchanged 928 inputs; tooling, package build and all ten fresh package checks pass. Deno reports 1008 passed and five failed: an unrelated-source invalidation assumption, two old diagnostic strings, a task fixture that never reads its pending task, and failed-versus-cancelled work status. Review also finds a real late-listener edge: registering onRetire after invalidation inside a host writer must wait for the same deferred retirement boundary. The next correction keeps genuinely affected-source cancellation, accepted history and cleanup assertions, and adds that host-boundary regression. No performance run is released.
