# Installed authored lifecycle consumer

This consumer carries the frozen 18 October 2026 lifecycle episode into fresh installed packages. `contract.ts`, `native_arm.tsx`, and `react_arm.tsx` are statement-identical copies of the reviewed workload. Each page imports only its selected arm through `native.ts` or `react.ts`; `entry.ts` supplies the same `window.__authoredLifecycle` driver API and rejects mounting the other arm.

The episode remains 256 keyed rows, a local row click, 60 all-row Store updates, a generic remove/insert/move edit, two independently revealed resources, and disposal with balanced lifetimes. `inspect()` reads actual DOM rows, styles, text, identity, resource state, and controller diagnostics without flushing. The browser protocol determines timing and heap collection outside this source.

The installed React arm uses actual ReactDOM declarations: two historical Deno-only suppression comments are removed and an explicit React JSX pragma is added. The prepare guard permits only those exact comment changes; Native and contract bytes remain identical to the historical source.
