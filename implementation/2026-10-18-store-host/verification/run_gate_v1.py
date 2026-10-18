#!/usr/bin/env python3
"""Run the released Store-host correctness boundary and preserve exact receipts."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
NODE = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node"
PATH = ":".join(
    [
        str(Path(NODE).parent),
        "/Users/mini/.local/share/mise/installs/node/26/bin",
        "/Users/mini/.cargo/bin",
        "/opt/homebrew/bin",
        os.environ.get("PATH", ""),
    ]
)
ENV = {**os.environ, "PATH": PATH}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def source_paths() -> list[Path]:
    paths: set[Path] = set()
    for dirname in ("src", "compiler", "packages", "scripts"):
        base = ROOT / dirname
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT)
            if any(part in {"target", "node_modules", ".cache", "dist"} for part in relative.parts):
                continue
            paths.add(relative)
    for name in (
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "deno.json",
        "deno.browser.json",
        "deno.lock",
        "tsconfig.json",
        "tsconfig.native-tooling.json",
        "tsconfig.r3act-packages.json",
        "vite.config.ts",
        "LICENSE",
    ):
        if (ROOT / name).is_file():
            paths.add(Path(name))
    store_slice = ROOT / "implementation/2026-10-18-store-host"
    for path in store_slice.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if "benchmark" in relative.parts or "verification" in relative.parts:
            continue
        paths.add(relative)
    authoring = ROOT / "docs/native-authoring-reference.md"
    if authoring.is_file():
        paths.add(authoring.relative_to(ROOT))
    return sorted(paths, key=lambda p: p.as_posix())


def write_lock(filename: str) -> dict:
    paths = source_paths()
    lock = {
        "schemaVersion": 1,
        "slice": "2026-10-18-store-host",
        "phase": filename,
        "inputs": [
            {"path": p.as_posix(), "sha256": digest(ROOT / p)} for p in paths
        ],
    }
    target = HERE / filename
    target.write_text(json.dumps(lock, indent=2) + "\n")
    return lock


def run(name: str, command: list[str]) -> dict:
    started = time.monotonic()
    print(f"START {name}: {' '.join(command)}", flush=True)
    result = subprocess.run(
        command,
        cwd=ROOT,
        env=ENV,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    duration = round(time.monotonic() - started, 3)
    log = HERE / f"{name}.log"
    log.write_bytes(result.stdout)
    receipt = {
        "command": command,
        "exitCode": result.returncode,
        "durationSeconds": duration,
        "log": log.name,
    }
    (HERE / f"{name}.exit.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"END {name}: exit={result.returncode} duration={duration}s log={log}", flush=True)
    if result.returncode:
        print(result.stdout.decode("utf-8", errors="replace")[-5000:], flush=True)
    return receipt


def snapshot_tree(source: Path, target: Path) -> dict:
    files = []
    for path in sorted(p for p in source.rglob("*") if p.is_file()):
        rel = path.relative_to(source)
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
        files.append({"path": rel.as_posix(), "bytes": path.stat().st_size, "sha256": digest(path)})
    return {"source": source.relative_to(ROOT).as_posix(), "files": files}


def main() -> None:
    initial = write_lock("source-lock-v1.json")
    lock_receipt = {
        "lock": "source-lock-v1.json",
        "inputCount": len(initial["inputs"]),
        "createdAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (HERE / "source-lock-v1.receipt.json").write_text(json.dumps(lock_receipt, indent=2) + "\n")

    cache = ROOT / ".cache/r3act-package-build"
    if cache.exists():
        pre = snapshot_tree(cache, HERE / "packaging-prebuild-v1")
        (HERE / "package-cache-prebuild-v1.json").write_text(json.dumps(pre, indent=2) + "\n")

    cargo_test = run(
        "cargo-test-v1",
        ["/Users/mini/.cargo/bin/cargo", "test", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml"],
    )
    cargo_build = run(
        "cargo-build-v1",
        ["/Users/mini/.cargo/bin/cargo", "build", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml"],
    )
    compiler = ROOT / "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"
    (HERE / "compiler-binary-v1.json").write_text(
        json.dumps(
            {
                "path": compiler.relative_to(ROOT).as_posix(),
                "exists": compiler.is_file(),
                "sha256": digest(compiler) if compiler.is_file() else None,
                "cargoTestExit": cargo_test["exitCode"],
                "cargoBuildExit": cargo_build["exitCode"],
            },
            indent=2,
        )
        + "\n"
    )

    run(
        "deno-full-v1",
        [
            "/opt/homebrew/bin/deno",
            "test",
            "--config",
            "deno.browser.json",
            "--frozen",
            "--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock",
            "src",
        ],
    )
    run("native-tooling-v1", ["pnpm", "check:native-tooling"])

    fixtures = [
        "compiler/compiled_direct_intent_test.mjs",
        "compiler/compiled_urgent_retained_test.mjs",
        "compiler/compiled_urgent_retained_three_test.mjs",
        "compiler/compiled_boundary_workset_test.mjs",
        "compiler/compiled_boundary_reveal_test.mjs",
        "compiler/native_resource_execution_test.mjs",
        "compiler/compiled_joint_transaction_test.mjs",
        "compiler/compiled_scoped_collection_test.mjs",
        "compiler/compiled_retained_transaction_test.mjs",
        "compiler/compiled_owner_row_execution_test.mjs",
        "compiler/compiled_owner_row_three_execution_test.mjs",
        "compiler/compiled_store_host_test.mjs",
    ]
    if cargo_build["exitCode"] == 0:
        for index, fixture in enumerate(fixtures, 1):
            run(
                f"compiled-{index:02d}-v1",
                [NODE, "--experimental-transform-types", fixture],
            )
    else:
        for index, fixture in enumerate(fixtures, 1):
            receipt = {
                "command": [NODE, "--experimental-transform-types", fixture],
                "status": "SKIPPED_DEPENDENCY_FAILED",
                "dependency": "cargo-build-v1",
            }
            (HERE / f"compiled-{index:02d}-v1.exit.json").write_text(json.dumps(receipt, indent=2) + "\n")

    run(
        "three-host-node-v1",
        [NODE, "--experimental-transform-types", "--test", "compiler/three_host_capability_test.mjs"],
    )
    run(
        "direct-intent-retention-v1",
        [NODE, "--experimental-transform-types", "--expose-gc", "scripts/verify_direct_intent_retention.mjs"],
    )
    run(
        "native-candidate-retention-v1",
        [NODE, "--experimental-transform-types", "--expose-gc", "scripts/verify_native_candidate_retention.mjs"],
    )

    package_build = run("package-build-v1", ["pnpm", "package:r3act"])
    if package_build["exitCode"] == 0 and cache.exists():
        package_archive = snapshot_tree(cache, HERE / "packaging-v1")
        (HERE / "package-archive-v1.json").write_text(json.dumps(package_archive, indent=2) + "\n")
        run("package-consumer-v1", ["pnpm", "check:r3act-packages"])
    else:
        (HERE / "package-consumer-v1.exit.json").write_text(
            json.dumps(
                {
                    "status": "SKIPPED_DEPENDENCY_FAILED",
                    "dependency": "package-build-v1",
                },
                indent=2,
            )
            + "\n"
        )

    final = write_lock("source-lock-v1-after.json")
    before = {item["path"]: item["sha256"] for item in initial["inputs"]}
    after = {item["path"]: item["sha256"] for item in final["inputs"]}
    changed = sorted(
        path for path in before.keys() | after.keys() if before.get(path) != after.get(path)
    )
    audit = {
        "beforeCount": len(before),
        "afterCount": len(after),
        "changedPaths": changed,
        "status": "MATCH" if not changed else "MISMATCH",
    }
    (HERE / "source-lock-audit-v1.json").write_text(json.dumps(audit, indent=2) + "\n")
    print(f"SOURCE_AUDIT {audit['status']} before={len(before)} after={len(after)} changed={len(changed)}", flush=True)


if __name__ == "__main__":
    main()
