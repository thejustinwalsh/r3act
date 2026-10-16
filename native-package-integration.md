# Private package integration — 12 October 2026

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
