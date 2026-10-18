#!/usr/bin/env python3
"""Run the final append-only and documentation/hash audits; no code tests."""

import hashlib
import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[3]
HERE = ROOT / "implementation/2026-10-18-store-host/verification"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_hashes(items: list[dict], expected_field: str = "expected") -> list[dict]:
    results = []
    for item in items:
        relative = item.get("path")
        if not relative:
            continue
        path = ROOT / relative
        actual = sha(path) if path.is_file() else None
        expected = item.get(expected_field) or item.get("sha256")
        results.append({"path": relative, "expected": expected, "actual": actual, "matches": actual == expected})
    return results


def notebook_audit() -> dict:
    command = ["/opt/homebrew/bin/python3", "implementation/2026-10-18-store-host/verification/verify_notebook_append.py"]
    started = time.monotonic()
    result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
    (HERE / "notebook-append-v1.log").write_bytes(result.stdout)
    receipt = {
        "command": command,
        "exitCode": result.returncode,
        "durationSeconds": round(time.monotonic() - started, 3),
        "log": "notebook-append-v1.log",
    }
    (HERE / "notebook-append-v1.exit.json").write_text(json.dumps(receipt, indent=2) + "\n")
    detail = json.loads(result.stdout) if result.returncode == 0 else {"error": result.stdout.decode("utf-8", errors="replace")}
    notebook = json.loads((ROOT / "research.ipynb").read_text())
    ids = [cell.get("id") for cell in notebook["cells"]]
    id_check = {
        "uniqueIds": len(ids) == len(set(ids)),
        "appendedCellId": ids[-1] if ids else None,
        "expectedAppendedCellId": "closed-store-host-20261018",
        "appendedCellIdMatches": bool(ids) and ids[-1] == "closed-store-host-20261018",
    }
    receipt.update(detail)
    receipt["cellIdAudit"] = id_check
    (HERE / "notebook-append-v1.receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return receipt


def added_markdown_lines() -> list[tuple[Path, str]]:
    paths = [
        "README.md",
        "docs/native-authoring-reference.md",
        "final-master-plan.md",
        "implementation-checkpoint.md",
        "implementation/2026-10-18-first-pass/design.md",
        "paper.md",
        "three-host-api.md",
    ]
    found: list[tuple[Path, str]] = []
    for name in paths:
        result = subprocess.run(
            ["git", "diff", "--unified=0", "--", name],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        current = Path(name)
        for line in result.stdout.decode("utf-8", errors="replace").splitlines():
            if line.startswith("+") and not line.startswith("+++"):
                found.append((current, line[1:]))
    for name in (
        "implementation/2026-10-18-store-host/benchmark/results.md",
        "implementation/2026-10-18-store-host/verification/gate-results.md",
    ):
        path = Path(name)
        if (ROOT / path).is_file():
            found.extend((path, line) for line in (ROOT / path).read_text().splitlines())
    notebook = json.loads((ROOT / "research.ipynb").read_text())
    last = notebook["cells"][-1]
    if last.get("cell_type") == "markdown":
        source = last.get("source", [])
        text = "".join(source) if isinstance(source, list) else source
        found.extend((Path("research.ipynb"), line) for line in text.splitlines())
    return found


def link_audit() -> dict:
    links = []
    for relative, line in added_markdown_lines():
        for match in re.finditer(r"!?\[[^\]]*\]\(([^)]+)\)", line):
            target = match.group(1).strip().split(maxsplit=1)[0]
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1]
            parsed = urlparse(target)
            if parsed.scheme or parsed.netloc:
                continue
            target_path = unquote(parsed.path)
            if not target_path:
                continue
            if target_path.startswith("/"):
                resolved = (ROOT / target_path.lstrip("/")).resolve()
            else:
                resolved = (ROOT / relative.parent / target_path).resolve()
            links.append({
                "source": relative.as_posix(),
                "target": target,
                "resolved": str(resolved),
                "exists": resolved.exists(),
            })
    missing = [item for item in links if not item["exists"]]
    return {"status": "PASS" if not missing else "FAIL", "checkedCount": len(links), "missing": missing, "links": links}


def main() -> None:
    notebook = notebook_audit()
    lock = json.loads((HERE / "source-lock-v2.json").read_text())
    source_results = resolve_hashes(lock["inputs"], "sha256")
    source_mismatches = [item for item in source_results if not item["matches"]]
    expected_doc = next(item for item in lock["inputs"] if item["path"] == "docs/native-authoring-reference.md")
    gate_copy = HERE / "document-integration/native-authoring-reference.md.at-gate"
    gate_copy_sha = sha(gate_copy)

    pair = json.loads((ROOT / "implementation/2026-10-18-store-host/benchmark/proof-v1/pair-one-shot.json").read_text())
    pair_audit = {
        "sourceLockSha256": pair["sourceLockSha256"],
        "beforeCount": len(pair["sourceBefore"]),
        "afterCount": len(pair["sourceAfter"]),
        "beforeMatches": resolve_hashes(pair["sourceBefore"]),
        "afterMatches": resolve_hashes(pair["sourceAfter"]),
    }
    pair_audit["beforeAllMatch"] = all(item["matches"] for item in pair_audit["beforeMatches"])
    pair_audit["afterAllMatch"] = all(item["matches"] for item in pair_audit["afterMatches"])

    proof_path = ROOT / "implementation/2026-10-18-store-host/benchmark/proof-v1/build-proof.json"
    proof = json.loads(proof_path.read_text())
    build_audit = resolve_hashes(proof["inputAudit"])
    build_assets = resolve_hashes(proof["assets"], "sha256")
    build_transforms = resolve_hashes(proof["transformed"], "sha256")
    binary = proof["compiler"]
    binary_path = ROOT / binary["path"]
    binary_check = {"path": binary["path"], "expected": binary["sha256After"], "actual": sha(binary_path), "matches": sha(binary_path) == binary["sha256After"]}
    build_proof_sha = sha(proof_path)
    proof_auth = json.loads((proof_path.parent / "run-authorization.json").read_text())

    three_gate_copy = HERE / "document-integration/three-host-api.md.at-gate"
    links = link_audit()
    audit = {
        "notebook": notebook,
        "notebookIdAuditPassed": notebook.get("cellIdAudit", {}).get("uniqueIds") and notebook.get("cellIdAudit", {}).get("appendedCellIdMatches"),
        "documentationLinks": links,
        "v2SourceLock": {
            "count": len(source_results),
            "mismatches": source_mismatches,
            "expectedOnlyDocumentationDelta": {
                "path": "docs/native-authoring-reference.md",
                "gateExpectedSha256": expected_doc["sha256"],
                "gateCopySha256": gate_copy_sha,
                "gateCopyMatches": gate_copy_sha == expected_doc["sha256"],
                "currentSha256": sha(ROOT / expected_doc["path"]),
            },
            "threeHostApiWasInV2Lock": any(item["path"] == "three-host-api.md" for item in lock["inputs"]),
            "threeHostApiGateCopyExists": three_gate_copy.is_file(),
            "status": "PASS_EXPECTED_DOC_DELTA" if len(source_mismatches) == 1 and source_mismatches[0]["path"] == "docs/native-authoring-reference.md" and gate_copy_sha == expected_doc["sha256"] else "REVIEW",
        },
        "pair": {
            "proofSha256": build_proof_sha,
            "authorizationProofSha256": proof_auth.get("buildProofSha256"),
            "authorizationMatches": proof_auth.get("buildProofSha256") == build_proof_sha,
            "sourceLockSha256": pair_audit["sourceLockSha256"],
            "sourceCountBefore": pair_audit["beforeCount"],
            "sourceCountAfter": pair_audit["afterCount"],
            "allCurrentHashesBeforeMatch": pair_audit["beforeAllMatch"],
            "allCurrentHashesAfterMatch": pair_audit["afterAllMatch"],
            "mismatchesBefore": [item for item in pair_audit["beforeMatches"] if not item["matches"]],
            "mismatchesAfter": [item for item in pair_audit["afterMatches"] if not item["matches"]],
        },
        "build": {
            "sourceLockCount": len(proof["inputAudit"]),
            "sourceLockMatches": all(item["matches"] for item in build_audit),
            "assetsCount": len(build_assets),
            "assetsMatch": all(item["matches"] for item in build_assets),
            "transformsCount": len(build_transforms),
            "transformsMatch": all(item["matches"] for item in build_transforms),
            "compilerBinary": binary_check,
            "mismatches": {
                "inputs": [item for item in build_audit if not item["matches"]],
                "assets": [item for item in build_assets if not item["matches"]],
                "transforms": [item for item in build_transforms if not item["matches"]],
            },
        },
    }
    target = HERE / "documentation-integrity-audit-v1.json"
    target.write_text(json.dumps(audit, indent=2) + "\n")
    print(json.dumps({
        "notebookExit": notebook["exitCode"],
        "notebookCells": [notebook.get("baselineCellCount"), notebook.get("currentCellCount")],
        "notebookCellId": notebook.get("cellIdAudit"),
        "docLinks": links["checkedCount"],
        "docLinksMissing": len(links["missing"]),
        "v2Inputs": len(source_results),
        "v2Mismatches": [item["path"] for item in source_mismatches],
        "pair721": [pair_audit["beforeAllMatch"], pair_audit["afterAllMatch"]],
        "buildInputsAssetsTransforms": [len(build_audit), len(build_assets), len(build_transforms)],
        "buildMismatches": [sum(not item["matches"] for item in build_audit), sum(not item["matches"] for item in build_assets), sum(not item["matches"] for item in build_transforms)],
    }, indent=2))


if __name__ == "__main__":
    main()
