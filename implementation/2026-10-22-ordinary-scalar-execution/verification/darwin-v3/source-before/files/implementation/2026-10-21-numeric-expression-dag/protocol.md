# Consolidated numeric DAG verification

Use Node 24.18.0, Rust 1.97.1, pnpm 11.25.0, Deno 2.9.7, one Cargo job and the existing frozen Deno runtime lock. Honor explicit Depot CARGO_HOME and existing task-local pnpm wrapper. Do not rewrite historical manifests.

After primary source review and author freeze, Luna runs the full native platform gate through the existing 1200-second bounded supervisor into fresh verification/darwin-v1. The runner creates the output directory. Inspect numeric exit, all compiled fixtures including new fixture 46, Rust/Deno counts, installed package consumers and before/after source hashes. Preserve every failure. No helper tests or diagnostic timing loop precedes the gate.

After a passing consolidated gate, prepare fresh installed consumer packages in proof-canvas-v1 and run its untimed proof. Inspect actual Native DAG/React Compiler AST proof, counters, values, hashes and cleanup. Primary must write a hash-bound authorization before the sole fixed-order timing comparison, twelve warmup and sixty measured RAFs per arm. No favorable repeat or causal comparison with the earlier one-prop workload.

The browser is headless, bounded and interruptible; synthetic HTTPS requests are intercepted offline, so no project server or VM starts. Stop only owned processes. If a server becomes necessary, load the Portless skill and use Portless HTTPS first. Report callback/publication/draw intervals precisely; readback hashes and RAF timestamps do not establish physical presentation. Setup intervals are not matched cold mount. No R3F, GPU, CPU, population-tail, memory or independent-device qualification is implied.
