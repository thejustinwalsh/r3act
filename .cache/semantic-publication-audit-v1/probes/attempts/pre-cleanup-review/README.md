# Public semantic publication probes

These two source-only Deno fixtures are **unrun**. They use the current live runtime and the public `ComponentStateRoot`, `NativeRootWorkQueue`, component hook, and `MemoryVDOMHost` extension APIs. No private field override or synthetic queue candidate is used. The source basis is the parent [source lock](../source-lock.json); the finite test inputs are in [input-manifest.json](input-manifest.json). They do not exercise compiler provenance or benchmark performance.

From the project root, Luna can run one bounded dependency-free type check and then the probes, using the existing Deno executable with a frozen no-lock/no-config local-import mode (these probes import no npm or JSR packages):

```sh
deno check --frozen --no-config --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/publication_probe_test.ts
deno test --frozen --no-config --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/publication_probe_test.ts
```

Treat a failed check as a failed gate and preserve its output. `--no-config --no-lock` isolates the known stale workspace package lock; it does not suppress TypeScript checking. The exact Deno version and command output should be recorded by the executing agent. Do not modify `deno.lock` or dependencies to manufacture a pass.

| Probe | Proposed §5 expectation | What the current assertion can establish |
|---|---|---|
| Setter and disposal inside host `setProp` while a prepared candidate applies | Reentrant dispatch is queued, managed accepted reads stay old, destructive disposal waits until active application exits; failed host application leaves no falsely published receipt. | Nested `flush()` is deferred, but `dispose()` returns *inside* the host callback, and the applying candidate rejects. The fixture records this order and the terminal disposed state. It deliberately does not infer atomic paint or a retained pending cut after deliberate disposal. |
| Two roots with `validateWork` changed by a public host `setText` | A host-domain failure is failed-partial; accepted revisions stay old, no automatic replay, later explicit remount/disposal. | Both physical host writes occur; posthost task validation fails the group before either `publish`; both Root publication revisions remain old. It does **not** demonstrate the separate serial-publish gap. |

The narrower case “first root publishes, then second root's `publish()` throws” has no clean public trigger identified here. The candidate-specific `publish` implementations call internal owner/Store/Root map operations and subscriptions after host work, but their failure seams are not injectable via a documented callback. A future authorized integration probe needs a deliberately exposed diagnostic failpoint at the publication boundary, or a source-grounded public callback that truly executes there. It must not patch private members or claim that a fake candidate proves native group behavior.
