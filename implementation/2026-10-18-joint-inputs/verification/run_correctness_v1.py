#!/usr/bin/env python3
"""Run the released joint-input correctness boundary with bounded inventories."""

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
CARGO_HOME = ROOT / ".cache/cargo"
ENV = {
    **os.environ,
    "CARGO_HOME": str(CARGO_HOME),
    "PATH": ":".join(
        [
            str(Path(NODE).parent),
            "/Users/mini/.local/share/mise/installs/node/26/bin",
            "/Users/mini/.cargo/bin",
            "/opt/homebrew/bin",
            os.environ.get("PATH", ""),
        ]
    ),
}
COMPILER = ROOT / "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"


def sha(path: Path) -> str | None:
    if not path.is_file():
        return None
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def source_paths() -> list[Path]:
    paths: set[Path] = set()
    excluded_dirs = {"target", ".cache", "node_modules", "dist", ".git"}
    for dirname in ("src", "compiler", "packages", "scripts"):
        base = ROOT / dirname
        for current, dirs, files in os.walk(base):
            dirs[:] = [name for name in dirs if name not in excluded_dirs]
            current_path = Path(current)
            for filename in files:
                path = current_path / filename
                paths.add(path.relative_to(ROOT))
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
    slice_root = ROOT / "implementation/2026-10-18-joint-inputs"
    if slice_root.exists():
        for current, dirs, files in os.walk(slice_root):
            dirs[:] = [name for name in dirs if name not in {"benchmark", "verification"}]
            current_path = Path(current)
            for filename in files:
                paths.add((current_path / filename).relative_to(ROOT))
    for name in ("docs/native-authoring-reference.md", "three-host-api.md"):
        if (ROOT / name).is_file():
            paths.add(Path(name))
    return sorted(paths, key=lambda p: p.as_posix())


def lock(name: str) -> dict:
    inputs = [{"path": p.as_posix(), "sha256": sha(ROOT / p)} for p in source_paths()]
    value = {"schemaVersion": 1, "slice": "2026-10-18-joint-inputs", "phase": name, "inputs": inputs}
    (HERE / name).write_text(json.dumps(value, indent=2) + "\n")
    return value


def run(name: str, command: list[str], *, extra_env: dict | None = None) -> dict:
    started = time.monotonic()
    print(f"START {name}: {' '.join(command)}", flush=True)
    result = subprocess.run(
        command,
        cwd=ROOT,
        env={**ENV, **(extra_env or {})},
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    receipt = {
        "command": command,
        "environment": {"CARGO_HOME": str(CARGO_HOME)},
        "exitCode": result.returncode,
        "durationSeconds": round(time.monotonic() - started, 3),
        "log": f"{name}.log",
    }
    (HERE / receipt["log"]).write_bytes(result.stdout)
    (HERE / f"{name}.exit.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"END {name}: exit={result.returncode} duration={receipt['durationSeconds']}s", flush=True)
    if result.returncode:
        print(result.stdout.decode("utf-8", errors="replace")[-4000:], flush=True)
    return receipt


def package_cache_audit() -> None:
    cache = ROOT / ".cache/r3act-package-build"
    prior = ROOT / "implementation/2026-10-18-store-host/verification/package-archive-v1.json"
    manifest = json.loads(prior.read_text())
    expected = {item["path"]: (item["bytes"], item["sha256"]) for item in manifest["files"]}
    current = {}
    if cache.exists():
        for path in sorted(p for p in cache.rglob("*") if p.is_file()):
            relative = path.relative_to(cache).as_posix()
            current[relative] = (path.stat().st_size, sha(path))
    mismatches = sorted(
        name for name in expected.keys() | current.keys() if expected.get(name) != current.get(name)
    )
    receipt = {
        "priorArchive": "implementation/2026-10-18-store-host/verification/package-archive-v1.json",
        "priorFileCount": len(expected),
        "currentFileCount": len(current),
        "status": "MATCH" if not mismatches else "MISMATCH",
        "mismatches": mismatches,
    }
    (HERE / "package-cache-prebuild-v1.json").write_text(json.dumps(receipt, indent=2) + "\n")
    if mismatches and cache.exists():
        snapshot = HERE / "packaging-prebuild-v1"
        shutil.copytree(cache, snapshot, dirs_exist_ok=False)
        receipt["mismatchSnapshot"] = "packaging-prebuild-v1/"
        (HERE / "package-cache-prebuild-v1.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"PACKAGE_PREBUILD {receipt['status']} files={len(current)} mismatches={len(mismatches)}", flush=True)


def archive_fresh_package() -> None:
    cache = ROOT / ".cache/r3act-package-build"
    archive = HERE / "packaging-v1"
    shutil.copytree(cache, archive, dirs_exist_ok=False)
    files = []
    for path in sorted(p for p in archive.rglob("*") if p.is_file()):
        relative = path.relative_to(archive).as_posix()
        files.append({"path": relative, "bytes": path.stat().st_size, "sha256": sha(path)})
    (HERE / "package-archive-v1.json").write_text(json.dumps({"source": ".cache/r3act-package-build", "files": files}, indent=2) + "\n")
    print(f"PACKAGE_ARCHIVED files={len(files)}", flush=True)


def main() -> None:
    before = lock("source-lock-v1.json")
    (HERE / "source-lock-v1.receipt.json").write_text(
        json.dumps({"inputCount": len(before["inputs"]), "cargoHome": str(CARGO_HOME)}, indent=2) + "\n"
    )
    package_cache_audit()

    run("cargo-test-v1", ["/Users/mini/.cargo/bin/cargo", "test", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml"])
    run("cargo-build-v1", ["/Users/mini/.cargo/bin/cargo", "build", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml"])
    (HERE / "compiler-binary-after-build-v1.json").write_text(
        json.dumps({"path": COMPILER.relative_to(ROOT).as_posix(), "sha256": sha(COMPILER), "cargoHome": str(CARGO_HOME)}, indent=2) + "\n"
    )

    run(
        "deno-full-v1",
        ["/opt/homebrew/bin/deno", "test", "--config", "deno.browser.json", "--frozen",
         "--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock", "src"],
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
        "compiler/compiled_joint_store_host_test.mjs",
        "compiler/compiled_joint_input_transaction_test.mjs",
    ]
    for index, fixture in enumerate(fixtures, 1):
        before_binary = sha(COMPILER)
        receipt = run(f"compiled-{index:02d}-v1", [NODE, "--experimental-transform-types", fixture])
        after_binary = sha(COMPILER)
        receipt.update({"debugCompilerSha256Before": before_binary, "debugCompilerSha256After": after_binary, "compilerChanged": before_binary != after_binary})
        (HERE / f"compiled-{index:02d}-v1.exit.json").write_text(json.dumps(receipt, indent=2) + "\n")

    run("three-host-node-v1", [NODE, "--experimental-transform-types", "--test", "compiler/three_host_capability_test.mjs"])
    run("direct-intent-retention-v1", [NODE, "--experimental-transform-types", "--expose-gc", "scripts/verify_direct_intent_retention.mjs"])
    run("native-candidate-retention-v1", [NODE, "--experimental-transform-types", "--expose-gc", "scripts/verify_native_candidate_retention.mjs"])

    package_build = run("package-build-v1", ["pnpm", "package:r3act"])
    if package_build["exitCode"] == 0:
        archive_fresh_package()
        run("package-consumer-v1", ["pnpm", "check:r3act-packages"])
    else:
        (HERE / "package-consumer-v1.exit.json").write_text(
            json.dumps({"status": "SKIPPED_DEPENDENCY_FAILED", "dependency": "package-build-v1"}, indent=2) + "\n"
        )

    after = lock("source-lock-v1-after.json")
    before_map = {item["path"]: item["sha256"] for item in before["inputs"]}
    after_map = {item["path"]: item["sha256"] for item in after["inputs"]}
    changed = sorted(path for path in before_map.keys() | after_map.keys() if before_map.get(path) != after_map.get(path))
    audit = {"beforeCount": len(before_map), "afterCount": len(after_map), "changedPaths": changed, "status": "MATCH" if not changed else "MISMATCH"}
    (HERE / "source-lock-audit-v1.json").write_text(json.dumps(audit, indent=2) + "\n")
    print(f"SOURCE_AUDIT {audit['status']} before={len(before_map)} after={len(after_map)} changed={len(changed)}", flush=True)


if __name__ == "__main__":
    main()
