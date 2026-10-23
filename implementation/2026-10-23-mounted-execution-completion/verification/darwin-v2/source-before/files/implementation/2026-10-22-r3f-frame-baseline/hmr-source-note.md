# Workbench HMR: bounded source continuation

A Sol-medium read-only review on base 04b7757 rechecked the remaining HMR gap without another server/browser/diagnostic run. No actionable product repair was established. The prior three-directory/absent-target readiness failure remains unchanged.

The old launcher explicitly supplies root/config and no watcher override (implementation/2026-10-21-workbench-hmr/serve-workbench.mjs:66). Installed Vite 8.3.1 constructs Chokidar with root when bundledDev is false (node_modules/vite/dist/node/chunks/node.js:24637). The installed root vitexec plugin does not disable watching; watch:null occurs in its separate openServer only (vitexec/dist/app.js:8). The native plugin's configuration modifies optimizeDeps, not watching. Chokidar's directory readiness accounting does not prove a missing-descendant race from the available receipt. Exact watched directory names and resolved depth/bundledDev/ignore results were not captured previously, so the cause is still unknown.

No speculative watched root, product mutation, manual reload, diagnostic repeat, server or VM is selected. Future acceptance still requires actual source-event delivery, revision invalidation, old-owner/task/subscription retirement, remount and cleanup through Portless HTTPS. This note is a source limit, not an HMR pass or speed result.
