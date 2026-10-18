#!/usr/bin/env python3
"""Preserve the exact Store-host v1 failure-era inputs before source repair."""

import hashlib
import json
import shutil
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parents[2]
archive = here / "failure-v1"
paths = [
    "src/closed_store_host_program.ts",
    "src/closed_store_host_program_test.ts",
    "src/component_store_host_cut_test.ts",
    "src/store_closed_read_test.ts",
    "src/vdom_store_prop_cut_test.ts",
    "src/async_store_runtime.ts",
    "src/component_state_runtime.ts",
    "src/native_root_work_queue.ts",
    "src/native_runtime_api.ts",
    "src/vdom_snapshot_runtime.ts",
    "compiler/oxc-spike/src/main.rs",
    "compiler/fixtures/native-closed-store-host.tsx",
    "compiler/compiled_store_host_test.mjs",
]
files = []
for relative in paths:
    source = root / relative
    target = archive / "source" / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    files.append(
        {
            "path": relative,
            "bytes": source.stat().st_size,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        }
    )
shutil.copy2(here / "source-lock-v1.json", archive / "source-lock-v1.json")
manifest = {
    "status": "PRESERVED_BEFORE_REPAIR",
    "denoReceipt": "../deno-full-v1.exit.json",
    "inputLock": "source-lock-v1.json",
    "files": files,
}
(archive / "failure-v1-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
