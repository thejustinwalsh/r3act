# Native package integration

## Current `@r3act/*` private-alpha workspace — 18 October 2026

The repository now builds five local tarballs with `pnpm package:r3act`:

| Package | Distribution role |
| --- | --- |
| `@r3act/core` | One runtime graph, native API, state/World ownership, and JSX helpers |
| `@r3act/vite` | Required Rust/OXC Vite compiler plugin and one bundled platform-targeted compiler |
| `@r3act/host-dom` | DOM host/root re-exports from core |
| `@r3act/host-three` | Three host and JSX re-exports from core; requires a compatible Three peer |
| `@r3act/react-bridge` | Optional React adapter re-export from core; requires a compatible React peer |

The tarballs are under `.cache/r3act-package-build/tarballs/r3act-*.tgz`.
They are **unpublished**, and the `@r3act` namespace is **unreserved**. Each
host or bridge package depends on the same core version and re-exports its
modules, so it does not create another World or reconciliation authority. The
native runtime replaces React for its supported TSX subset; install the React
bridge only for an explicit migration boundary. React and Three remain optional
peers of core.

### Install the local tarballs

In a separate consumer, point package dependencies at the tarballs produced by
the checkout. Replace `/absolute/path/to/r3act` with that checkout's path:

```json
{
  "type": "module",
  "dependencies": {
    "@r3act/core": "file:/absolute/path/to/r3act/.cache/r3act-package-build/tarballs/r3act-core.tgz",
    "@r3act/vite": "file:/absolute/path/to/r3act/.cache/r3act-package-build/tarballs/r3act-vite.tgz",
    "@r3act/host-dom": "file:/absolute/path/to/r3act/.cache/r3act-package-build/tarballs/r3act-host-dom.tgz",
    "@r3act/host-three": "file:/absolute/path/to/r3act/.cache/r3act-package-build/tarballs/r3act-host-three.tgz",
    "@r3act/react-bridge": "file:/absolute/path/to/r3act/.cache/r3act-package-build/tarballs/r3act-react-bridge.tgz",
    "vite": "8.3.1",
    "three": "0.186.1",
    "react": "19.3.0"
  }
}
```

Because these names are not on a registry, pnpm 11 also needs a workspace-level
override for the thin packages' core dependency. Put this in the consumer's
`pnpm-workspace.yaml`, using the same absolute core tarball path:

```yaml
packages:
  - .
overrides:
  "@r3act/core": "file:/absolute/path/to/r3act/.cache/r3act-package-build/tarballs/r3act-core.tgz"
```

Then run `pnpm install --ignore-scripts`. The React and Three packages can be
omitted when those integrations are unused. The builder includes source maps,
authored TypeScript sources and MIT license files in each relevant artifact.

### Compile native TSX

Configure Vite and TypeScript in the consumer:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { nativeModulePlugin } from "@r3act/vite";

export default defineConfig({ plugins: [nativeModulePlugin()] });
```

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@r3act/core"
  }
}
```

Import native hooks and stores from `@r3act/core`; import `createDOMRoot` or
`DOMVDOMHost` from `@r3act/host-dom`. A Three TSX file can select its host JSX
types with `/** @jsxImportSource @r3act/host-three */`. Native hooks require the
Rust/OXC transform; an uncompiled hook call fails explicitly. The supported
syntax and generic fallback boundaries are in the [compiler tooling note](compiler-tooling.md)
and [research guide](RESEARCH-GUIDE.md). Native module edits invalidate their
revision and trigger a conservative full-page reload; state-preserving HMR is
not promised.

The `@r3act/vite` tarball installs on other platforms, but its bundled
executable targets only the build machine's OS and CPU. Its CLI name includes
that target, such as `r3act-compiler-darwin-arm64`. On another target, provide a
compatible executable with `nativeModulePlugin({ compilerBinary: "/path/to/compiler" })`.
The package does not supply cross-platform Rust binaries or perform a consumer
Cargo build.

### Explicit joint transactions

`ComponentStateRoot.prepareTransaction({ cells, collections })` names one
candidate over the complete joint closed primitive input-cell set and selected
keyed collections. `NativeRootWorkQueue.enqueueTransaction` submits the same
shape across roots. The scoped collection portion supports existing-row
move/remove edits; a selected cell owner cannot be removed by that cut.
Whole-tree/cache replacements keep whole-root version guards. Authored
insert/replace and opaque row/component callbacks use the generic path; static
intrinsic host-tree handling does not prove arbitrary callback purity. The
declared group coordinates managed accepted state, but custom host setters may
observe intermediate writes and no cross-host visual atomicity is claimed.

The current mixed slice has a passing 813-test runtime correctness gate. The
fresh installed consumer passed with all five tarballs, hash-checked source
maps, TSX types, one shared runtime graph and actual Rust/OXC compilation
without Cargo ([consumer v3 log](implementation/2026-10-18-first-pass/verification/package-consumer-v3.log),
[archived package build](implementation/2026-10-18-first-pass/verification/packaging-v2/report.json)).
Earlier consumer attempts failed at unpublished-package resolution and packed
compiler executable mode; their logs remain in [current verification](implementation/2026-10-18-first-pass/verification/).
The consolidated commands are `pnpm package:r3act` and
`pnpm check:r3act-packages`. They check the build machine's artifact and one
fresh consumer. A separate [N=1,024 one-pair comparison](implementation/2026-10-18-first-pass/benchmark/proof-v1/pair-one-shot.json)
passed output, identity and lifecycle checks; native measured 0.85 ms median
against React Compiler's 0.50 ms for 64 selected setters and one row move.
That ratio is descriptive from one pair, not a performance qualification.
Cold/memory, tail replication, other platforms and a second device remain open.

## Historical `@compiled-ui/runtime` private integration — 12 October 2026

`pnpm package:native` builds a private `@compiled-ui/runtime` tarball at
`.cache/compiled-ui-runtime.tgz`. The temporary name and version are integration
identifiers, not a frozen public API or release. Build prerequisites are this
repository's pinned TSgo toolchain and Rust/Cargo. The generated package includes
a release Rust/OXC executable for the build machine's OS and architecture.
Its `os`/`cpu` metadata restricts installation accordingly; this checkpoint
verifies Darwin ARM64 only. Other platform artifacts and release automation
remain unfinished.

## Consumer setup

Install the tarball with Vite 8, then configure:

```ts
import { defineConfig } from "vite";
import { nativeModulePlugin } from "@compiled-ui/runtime/vite";

export default defineConfig({ plugins: [nativeModulePlugin()] });
```

Set TypeScript `jsx: "react-jsx"` and
`jsxImportSource: "@compiled-ui/runtime"`. Author components with named imports
from `@compiled-ui/runtime` or `/core`. Supported native modules are compiled
without a marker, factory import or pragma. Uncompiled hooks still throw. JSX
helpers alone do not perform owner/state/dependency compilation.

Entries are core, DOM, Three, React mount adapter, Vite plugin, `jsx-runtime` and
`jsx-dev-runtime`. React and Three are optional peer dependencies for their
entries. The DOM entry exposes its host/root API rather than the research memory
host. Automatic JSX helpers correctly consume `props.children` and the separate
key; the classic factory remains distinct. Development metadata is accepted but
not retained. Generic intrinsic JSX types are not yet host-specific validation.

## Maintained proof

`pnpm check:native-package` installs the actual tarball in a fresh temporary
directory outside the repository, with installation scripts disabled. It checks
authored TSX types and all public entry imports. It blocks Cargo with a failing
executable, builds real state/store/task TSX with the zero-options installed
plugin, then exercises the emitted app against a consumer-defined host. State
and store updates, retained button identity, inferred task edges and complete
store/root teardown must pass. The task callback output needs normal TypeScript
narrowing; task contexts do not infer upstream provider return types yet.

This caught and fixed public-package import recognition in Rust, native discovery
for Vite-externalized package imports, and compiler executable permissions after
packing. The package's binary entry preserves executable installation semantics;
there is no postinstall Cargo build. A development checkout retains Cargo startup,
and an explicit `compilerBinary` plugin option supports a supplied executable.

Results are written to `.cache/native-package-verification/results.json`. The
build writes a package hash and distribution footprint to
`.cache/native-package-build/package-report.json`. These are installation and
distribution checks, not comparative bundle-size or runtime-speed measurements.

State-preserving HMR, automatic React Refresh composition, stateless TSX with no
native import, broader compiler syntax, typed host registries, multi-platform
packages and a selected React store/library bridge remain open. Existing HMR
remount/cleanup tests cover the development application; this package fixture
does not claim installed-package HMR coverage.

## Verification staging correction

The copied legacy resource-browser script still wrote to its original cache
directory. This checkpoint corrects its output paths and reruns it before
archiving. Prior checkpoint command logs represent executed checks, but their
copied resource-browser JSON/screenshots may come from an earlier cache run.
Those archives remain immutable; use this checkpoint's freshly routed records
for the current resource-boundary observation.
