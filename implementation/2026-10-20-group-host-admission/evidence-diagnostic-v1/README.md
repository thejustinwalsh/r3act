# Isolated grouped-admission diagnosis

This snapshot is for one correctness diagnosis of the failing compiled joint-input transaction. It is not a qualification run or performance evidence. The product source and earlier gate artifacts remain unchanged.

Run once from the repository root:

```sh
python3 implementation/2026-10-20-group-host-admission/evidence-diagnostic-v1/run-once.py
```

The runner bounds the child process to 90 seconds, terminates its owned process group on timeout, and preserves stdout, stderr, exit status, generated `.cache` artifacts, and partial output under this directory. It refuses a second run after writing `logs/run-001.json`.

The workspace contains a full source copy, the target compiler fixture and its direct plugin imports, and a package manifest. `node_modules` and the pinned Rust debug compiler are symlinks to their existing product paths; their targets are recorded in `manifest.json`. The only instrumented files are the copied Root and VDOM runtimes. Each added guard logs `[GROUP-DIAG]` with a failing label and root ID (the VDOM copy uses a per-instance diagnostic number). Guards return the original boolean and preserve short-circuit order. The two `.patch` files show every instrumentation change. `manifest.json` records SHA-256 values for all copied product files before and after preparation and for every snapshot file.
