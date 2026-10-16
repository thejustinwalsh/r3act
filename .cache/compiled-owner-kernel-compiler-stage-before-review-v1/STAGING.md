# Isolated OXC owner-kernel prototype

All compiler edits belong under `compiler/oxc-spike/src/main.rs` in this directory. Cargo inputs are the copied Cargo.toml/Cargo.lock and copied `compiler/fixtures/` needed by `include_str!` tests. Run Rust checks with `CARGO_TARGET_DIR=$PWD/.cache/compiled-owner-kernel-compiler-stage/target`; do not use the live crate target directory or edit live files.

No staged checks have been run yet. The prototype will retain schema-v2 sink descriptors/projectors and add only additive component metadata plus an emitted module-scope cut kernel.
