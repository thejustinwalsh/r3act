# Compiled UI private integration artifact

This is a platform-specific private alpha build, not a published package. Native authored TSX requires `nativeModulePlugin()` from `@compiled-ui/runtime/vite`. Use `jsxImportSource: "@compiled-ui/runtime"` for types. Uncompiled hooks fail explicitly. The package includes one Rust/OXC compiler executable for aarch64-apple-darwin (darwin-arm64); consuming this artifact needs no Cargo build. Native HMR remounts roots; applications own teardown. State-preserving HMR, React library parity, other platform binaries, and performance/maintenance claims are not established.

JavaScript and declaration source maps resolve to authored TypeScript files under `sources/` in the installed package for editor and debugger navigation.
