#!/usr/bin/env python3
import datetime
import hashlib
import json
import os
import pathlib
import selectors
import shutil
import signal
import subprocess
import sys
import time

ROOT = pathlib.Path("/Volumes/Depot/Developer/r3act")
BASE = ROOT / "implementation/2026-10-19-react-island/verification"
OUT = BASE / "darwin-package-supplement-v3"
SETUP = BASE / "runner-setup-v3"
SOURCE_MANIFEST = BASE / "source-v2/manifest.json"
SOURCE_BEFORE = OUT / "source-compiler-before.json"
COMPILER = ROOT / "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"
CACHE = ROOT / ".cache/r3act-package-build"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def capture_cache(label):
    dest = OUT / f"package-cache-{label}/files"
    dest.mkdir(parents=True, exist_ok=True)
    rows = []
    if CACHE.exists():
        for source in sorted(CACHE.rglob("*")):
            if source.is_file():
                rel = source.relative_to(CACHE).as_posix()
                data = source.read_bytes()
                target = dest / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                rows.append({"path": rel, "sha256": sha(data), "bytes": len(data)})
    result = {"status": "ARCHIVED", "files": rows}
    write_json(OUT / f"package-cache-{label}/manifest.json", result)
    return result


def source_audit():
    manifest = json.loads(SOURCE_MANIFEST.read_text())
    expected = {entry["path"]: entry for entry in manifest["inputs"]
                if entry.get("kind") == "runner-input"}
    previous = json.loads((BASE / "darwin-v2/source-before.json").read_text())["inputs"]
    mismatches = []
    if len(expected) != 859 or len(previous) != 859:
        mismatches.append({"reason": "source-count", "expected": len(expected), "v2": len(previous)})
    before_map = {row["path"]: row for row in previous}
    if set(expected) != set(before_map):
        mismatches.append({"reason": "path-set", "missing": sorted(set(expected) - set(before_map)),
                           "extra": sorted(set(before_map) - set(expected))})
    for rel, entry in expected.items():
        current = (ROOT / rel).read_bytes()
        archived = (BASE / "source-v2/files" / rel).read_bytes()
        v2 = before_map.get(rel)
        for label, data in (("current", current), ("archive", archived)):
            if len(data) != entry["bytes"] or sha(data) != entry["sha256"]:
                mismatches.append({"path": rel, "source": label})
        if v2 and (v2["bytes"] != entry["bytes"] or v2["sha256"] != entry["sha256"]):
            mismatches.append({"path": rel, "source": "v2-receipt"})
    return {"sourceCount": len(expected), "mismatches": mismatches,
            "match": not mismatches,
            "sourceV2ManifestSha256": sha(SOURCE_MANIFEST.read_bytes())}


def tracked_cache_audit(legacy_before):
    tracked = subprocess.check_output(["git", "ls-files", ".cache"], cwd=ROOT, text=True).splitlines()
    diff = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", ".cache"], cwd=ROOT).returncode
    legacy_after = {}
    for rel in legacy_before:
        legacy_after[rel] = sha((ROOT / rel).read_bytes())
    return {"trackedFileCount": len(tracked), "diffHeadClean": diff == 0,
            "legacyFileCount": len(legacy_after),
            "legacyMatchesBefore": legacy_after == legacy_before,
            "legacyChanged": sorted(path for path in legacy_before
                                    if legacy_before[path] != legacy_after.get(path))}


def run_step(name, argv, deadline_ms, env):
    step = {"name": name, "argv": argv, "deadlineMs": deadline_ms,
            "startedAt": utc_now(), "log": f"logs/{name}.log"}
    log_path = OUT / step["log"]
    start = time.monotonic()
    timed_out = False
    spawn_error = None
    process = None
    selector = selectors.DefaultSelector()
    with log_path.open("wb") as log:
        try:
            process = subprocess.Popen(argv, cwd=ROOT, env=env, stdout=subprocess.PIPE,
                                        stderr=subprocess.STDOUT, start_new_session=True,
                                        bufsize=0)
            selector.register(process.stdout, selectors.EVENT_READ)
            print(f"{name}: STARTED pid={process.pid}", flush=True)
            while True:
                remaining = deadline_ms / 1000 - (time.monotonic() - start)
                if remaining <= 0 and process.poll() is None:
                    timed_out = True
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    break
                for key, _ in selector.select(timeout=min(1.0, max(0.0, remaining))):
                    chunk = os.read(key.fd, 65536)
                    if chunk:
                        log.write(chunk)
                        log.flush()
                        sys.stdout.buffer.write(chunk)
                        sys.stdout.buffer.flush()
                    else:
                        selector.unregister(key.fileobj)
                if process.poll() is not None and not selector.get_map():
                    break
            if timed_out:
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    process.wait()
            else:
                process.wait()
        except Exception as error:
            spawn_error = repr(error)
        finally:
            if process is not None and process.poll() is not None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                except Exception as error:
                    step["groupCleanupError"] = repr(error)
            selector.close()
    step["durationMs"] = round((time.monotonic() - start) * 1000)
    step["timedOut"] = timed_out
    step["exitCode"] = process.returncode if process is not None else None
    step["spawnError"] = spawn_error
    step["status"] = "PASS" if process is not None and process.returncode == 0 and not timed_out and not spawn_error else "FAIL"
    return step


def package_artifact_audit():
    report_path = CACHE / "report.json"
    if not report_path.exists():
        return {"status": "NO_REPORT", "packages": []}
    report = json.loads(report_path.read_text())
    packages = []
    for name, detail in sorted(report.get("packages", {}).items()):
        path = ROOT / detail["file"]
        if not path.exists():
            packages.append({"name": name, "path": detail["file"], "exists": False,
                             "matchesReport": False})
            continue
        data = path.read_bytes()
        actual = {"sha256": sha(data), "bytes": len(data)}
        packages.append({"name": name, "path": detail["file"], "expected": {
            "sha256": detail.get("sha256"), "bytes": detail.get("bytes")},
            "actual": actual, "matchesReport": actual["sha256"] == detail.get("sha256") and
            actual["bytes"] == detail.get("bytes")})
    consumer_path = CACHE / "consumer-verification.json"
    consumer = json.loads(consumer_path.read_text()) if consumer_path.exists() else None
    return {"status": report.get("status", "UNKNOWN"), "published": report.get("published"),
            "platform": report.get("platform"), "packageCount": len(packages),
            "packages": packages, "compilerBinary": report.get("compilerBinary"),
            "consumerStatus": consumer.get("status") if consumer else None,
            "consumerReport": consumer}


def main():
    out = OUT
    receipt_path = out / "supplement-receipt.json"
    if not out.exists() or receipt_path.exists():
        raise SystemExit("supplement output missing or receipt already exists")
    (out / "logs").mkdir(exist_ok=False)
    env = os.environ.copy()
    shim_dir = pathlib.Path("/private/tmp/react-island-darwin-package-supplement-v3-bin")
    shim_path = shim_dir / "pnpm"
    recorded_shim = SETUP / "pnpm"
    shim_hash = sha(shim_path.read_bytes())
    if shim_hash != sha(recorded_shim.read_bytes()) or env.get("CI") != "true":
        raise SystemExit("shim or CI preflight failed")
    if "CARGO_TARGET_DIR" in env or "CARGO_BUILD_TARGET" in env:
        raise SystemExit("Cargo target override present")
    if shutil.which("pnpm", path=env.get("PATH")) != str(shim_path):
        raise SystemExit("pnpm does not resolve to the preserved conditional shim")
    pre = json.loads((SETUP / "preflight-and-environment.json").read_text())
    if not pre["status"] == "PASS" or not source_audit()["match"]:
        raise SystemExit("source/archival preflight failed")
    compiler_before = sha(COMPILER.read_bytes())
    if compiler_before != pre["sourcePreflight"]["compilerSha256Before"]:
        raise SystemExit("compiler changed after recorded preflight")
    source_before = json.loads(SOURCE_BEFORE.read_text())
    legacy_before = pre["cachePreflight"]["legacyNativePackageBuildSha256Before"]
    if len(legacy_before) != 176:
        raise SystemExit("legacy native-package build cache inventory drift")
    cache_before_audit = tracked_cache_audit(legacy_before)
    if (cache_before_audit["trackedFileCount"] != 19799 or
            cache_before_audit["legacyFileCount"] != 176 or
            not cache_before_audit["diffHeadClean"] or
            not cache_before_audit["legacyMatchesBefore"]):
        raise SystemExit("tracked research cache changed after preflight")
    if len(json.loads((out / "package-cache-before/manifest.json").read_text())["files"]) != 488:
        raise SystemExit("package cache before-image count drift")

    receipt = {"schemaVersion": 1, "status": "RUNNING", "kind": "bounded pnpm environment/package supplement; not a replacement consolidated gate", "startedAt": utc_now(),
               "environment": {"CI": env.get("CI"), "PATH": env.get("PATH"),
                   "node": "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node",
                   "pnpmShim": str(shim_path), "pnpmShimSha256": shim_hash,
                   "pnpmStore": "/Volumes/Depot/.pnpm-store", "CARGO_HOME": env.get("CARGO_HOME"),
                   "CARGO_BUILD_JOBS": env.get("CARGO_BUILD_JOBS"),
                   "CARGO_TARGET_DIR": "UNSET", "CARGO_BUILD_TARGET": "UNSET"},
               "sourceBefore": source_before, "compilerBeforeSha256": compiler_before,
               "trackedCacheBefore": cache_before_audit,
               "steps": [], "notes": ["No install command is run here. The package consumer may invoke pnpm install; the conditional shim adds --store-dir only for argv[1] == install."]}
    write_json(receipt_path, receipt)
    commands = [
        ("native-tooling", ["pnpm", "check:native-tooling"], 300_000),
        ("package-build", ["pnpm", "package:r3act"], 900_000),
        ("package-consumer", ["pnpm", "check:r3act-packages"], 900_000),
    ]
    previous_pass = True
    for index, (name, argv, deadline) in enumerate(commands):
        if not previous_pass:
            step = {"name": name, "argv": argv, "deadlineMs": deadline,
                    "status": "SKIPPED_DEPENDENCY_FAILED", "exitCode": None,
                    "log": f"logs/{name}.log"}
            receipt["steps"].append(step)
            write_json(receipt_path, receipt)
            print(f"{name}: SKIPPED_DEPENDENCY_FAILED", flush=True)
            continue
        step = run_step(name, argv, deadline, env)
        receipt["steps"].append(step)
        write_json(receipt_path, receipt)
        print(f"{name}: {step['status']} exit={step['exitCode']}", flush=True)
        previous_pass = step["status"] == "PASS"

    receipt["packageCacheAfter"] = capture_cache("after")
    receipt["packageArtifacts"] = package_artifact_audit() if any(s["name"] == "package-build" and s["status"] == "PASS" for s in receipt["steps"]) else {"status": "NOT_RUN_PACKAGE_BUILD_FAILED_OR_SKIPPED", "packages": []}
    after_source = source_audit()
    after_compiler = sha(COMPILER.read_bytes())
    legacy_audit = tracked_cache_audit(legacy_before)
    receipt["sourceAfterAudit"] = after_source
    receipt["compilerAfterSha256"] = after_compiler
    receipt["compilerStable"] = compiler_before == after_compiler
    receipt["trackedCacheAfter"] = legacy_audit
    receipt["completedAt"] = utc_now()
    passed = len(receipt["steps"]) == 3 and all(step["status"] == "PASS" for step in receipt["steps"])
    receipt["status"] = "PASS" if passed and after_source["match"] and receipt["compilerStable"] and legacy_audit["trackedFileCount"] == 19799 and legacy_audit["legacyFileCount"] == 176 and legacy_audit["diffHeadClean"] and legacy_audit["legacyMatchesBefore"] else "FAIL"
    write_json(receipt_path, receipt)
    print(f"SUPPLEMENT {receipt['status']}: {receipt_path}", flush=True)
    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
