# Installed package Vite findings

The Darwin arm64 private package now passes installed-consumer compilation, actual Three host updates, real DOM mounting, React adapter updates and a fixture-managed HMR remount with complete teardown. The installed Vite plugin uses zero options, and Cargo is blocked in consumer compilation and the browser development server.

## Development compiler failure and fix

The first package passed its production-build smoke checks but failed in the development browser. Vite optimized `@compiled-ui/runtime` into a generated dependency bundle. The compiler's opt-in guard recognizes the canonical runtime entry, so it declined the optimized path. Native TSX was lowered as React JSX; the native root then rejected its component as unregistered.

The plugin now excludes the public runtime package family from Vite dependency optimization. This preserves canonical resolution and a shared runtime module identity. User optimizer settings remain intact, and ordinary React modules remain on their normal transform path. The resolution guard continues to reject optimizer-generated and similarly named lookalike entries.

The primary regression, existing native module/plugin tests, generated host JSX tests and tooling type check pass. The served installed TSX contains `__nativeDefineComponent`, `__nativeUseStateAt` and the native JSX factory. This verifies that the browser is using compiler output rather than unregistered component functions.

## Installed integration coverage

The package smoke check installs with scripts disabled in an external directory, checks public imports and JSX types, rejects invalid Three/custom-host arguments and method props, generates JSX declarations for both automatic runtimes, and compiles authored TSX through the bundled Rust/OXC executable. State, store, task dependencies, identity and disposal checks pass. A separate authored Three scene checks actual Vector3 and material updates through the public host and releases its resources.

The browser fixture mounts native components directly and through React 19. It checks native state changes, committed React prop updates and effects. Editing its native TSX triggers the fixture's `import.meta.hot.accept` handler, which explicitly tears down both old roots and mounts fresh ones. Old effects and store roots, listeners, readers, retained actions and transitions reach zero. The new roots also pass final teardown.

This establishes the tested application-managed cleanup/remount pattern. It does not establish automatic plugin-owned root disposal or state-preserving HMR. The React adapter remains a bounded native subtree bridge; general React library parity is a separate requirement.

## Artifacts and remaining limits

The failed first package and its browser evidence are preserved under `implementation/2026-10-13-compiled-owner-row-package-v1/`. The corrected package and integration evidence are under `implementation/2026-10-13-installed-vite-dev-fix/`, with build and consumer outputs in `.cache/compiled-owner-rows-package-v2/`.

This is an unpublished private alpha package for Darwin arm64. The development server reports runtime source-map paths pointing outside the installed package; runtime TypeScript source distribution and declaration-map usability need a separate packaging repair. The application TSX compiler regression checks its source mapping, but these package warnings limit the debugging experience.

The runtime used by this package is the compiled owner-row implementation whose independently verified timing gate fails. Package integration does not establish a performance, allocation, independent-device or maintenance advantage.
