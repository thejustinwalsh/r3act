# Installed mixed HMR completion harness

This successor uses the current five `@r3act` tarballs in a fresh temporary consumer. It retains the actual shared World/Store, native DOM and Three roots, pending grouped reveal, borrowed Three resources, controlled Radix island, and stateful React panel from the earlier offline fixture. `Position` is now a module-level const arrow, exercising current native authoring support. No older proof receipt qualifies this changed consumer or the revised HMR compiler.

The replaced harness was `implementation/2026-10-19-installed-hmr`. Its invalid native edit could retire the accepted revision before a failed transform, and its verifier skipped all browser errors when that edit was enabled. This harness requires the invalid edit, captures the exact overlay and console diagnostics, rejects page errors and unrelated browser errors, and checks the old accepted DOM/Three/React lifetimes while the overlay is visible. It then verifies a valid native edit's revision event, full reload, old pending-work cancellation, fresh root state and balanced teardown. A pure React edit must preserve its local count and native root identity without navigation.

Use Node 24.18.0. After the current package builder has produced a report whose source hashes match the reviewed HMR product change, prepare one new proof directory:

```sh
node implementation/2026-10-19-hmr-completion/prepare.mjs --proof-dir implementation/2026-10-19-hmr-completion/proof-v1
```

Preparation copies the authored consumer outside the checkout, installs five fresh tarballs, records the installed dependency graph and compiler bytes, typechecks, and builds. It does not start a project server. Preserve a failed proof directory; use a new namespace for a corrected source.

The primary must load the Portless server guidance before release. The orchestrator uses the already installed Portless CLI and the existing HTTPS proxy on port 1355. It creates a unique temporary route, starts the consumer's installed Vite binary directly, checks HTTPS with the Portless CA, runs one headless/GPU-off browser check, then stops only its own process group and verifies shared routes remain. Pass the exact installed CLI path:

```sh
node implementation/2026-10-19-hmr-completion/run-browser.mjs --proof-dir implementation/2026-10-19-hmr-completion/proof-v1 --portless-cli /Users/mini/.npm/_npx/671a8c421a9d7808/node_modules/portless/dist/cli.js
```

The orchestrator has a 150-second server/readiness/verifier deadline; the verifier's browser deadline is 90 seconds. It edits only the temporary consumer, archives invalid and valid revised sources, and closes its browser. `browser-server.json` records route ownership, verified HTTPS readiness, selected environment, raw process exits and shared-route preservation. `browser-hmr.json` requires context/browser close, no timeout, exact source hashes and no unrelated errors. A leftover owned route is reported as a failure for scoped cleanup. The consumer remains a temporary diagnostic checkout; accepted native HMR may reload/remount, while React Refresh must retain the panel's local state and native roots.

The matched counter entries have equal visible heading/button/count output and one `useState` call each. Run the untimed Native-first build proof after preparation; it verifies the actual generic Native plan and React Compiler output before any build observation:

```sh
node implementation/2026-10-19-hmr-completion/run-build-pair.mjs --proof-dir implementation/2026-10-19-hmr-completion/proof-v1 --phase proof
```

After the consolidated correctness gate and browser proof pass, the primary may release one build observation by writing `run-authorization.json` with `status: "APPROVED_FOR_ONE_BUILD_PAIR"` and SHA-256 fields `buildProofSha256`, `pairProofSha256`, `browserHmrSha256`, and `browserServerSha256` from the exact four receipt files. Then run once:

```sh
node implementation/2026-10-19-hmr-completion/run-build-pair.mjs --proof-dir implementation/2026-10-19-hmr-completion/proof-v1 --phase measure
```

The measure phase requires those hashes, verifies installed/source locks before and after, and requires transform, asset and compiler-event equality with the untimed proof. It captures one Native-first fresh-process Vite pair, potentially with warm caches. This is build/setup evidence only; it does not qualify HMR latency, runtime, cold/memory, presentation, independent-device behavior or a speed advantage.
