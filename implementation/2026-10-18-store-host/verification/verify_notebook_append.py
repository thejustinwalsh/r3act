"""Verify the planned Markdown-only continuation against the slice baseline."""
import hashlib
import json
import pathlib
import subprocess

BASELINE = "bfdf179"
NOTEBOOK = pathlib.Path("research.ipynb")

baseline_bytes = subprocess.run(
    ["git", "show", f"{BASELINE}:{NOTEBOOK.as_posix()}"],
    check=True,
    capture_output=True,
).stdout
current_bytes = NOTEBOOK.read_bytes()
baseline = json.loads(baseline_bytes)
current = json.loads(current_bytes)

assert baseline["metadata"] == current["metadata"], "notebook metadata changed"
assert len(current["cells"]) == len(baseline["cells"]) + 1, "expected exactly one appended cell"
assert current["cells"][:-1] == baseline["cells"], "a baseline cell, output, or cell metadata changed"
appended = current["cells"][-1]
assert appended.get("cell_type") == "markdown", "the appended cell must be Markdown"
assert "outputs" not in appended or appended["outputs"] == [], "Markdown continuation has unexpected outputs"

print(json.dumps({
    "status": "PASS_APPEND_ONLY_MARKDOWN",
    "baseline": BASELINE,
    "baselineCellCount": len(baseline["cells"]),
    "currentCellCount": len(current["cells"]),
    "metadataUnchanged": True,
    "baselineCellsOutputsAndMetadataUnchanged": True,
    "appendedCellType": appended["cell_type"],
    "baselineSha256": hashlib.sha256(baseline_bytes).hexdigest(),
    "currentSha256": hashlib.sha256(current_bytes).hexdigest(),
}, indent=2))
