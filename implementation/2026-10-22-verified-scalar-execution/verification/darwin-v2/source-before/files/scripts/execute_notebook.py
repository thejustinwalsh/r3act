from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JUPYTER_ROOT = ROOT / ".jupyter"

for directory in ("config", "data", "runtime", "ipython"):
    (JUPYTER_ROOT / directory).mkdir(parents=True, exist_ok=True)

os.environ["JUPYTER_PATH"] = str(JUPYTER_ROOT)
os.environ["JUPYTER_DATA_DIR"] = str(JUPYTER_ROOT / "data")
os.environ["JUPYTER_CONFIG_DIR"] = str(JUPYTER_ROOT / "config")
os.environ["JUPYTER_RUNTIME_DIR"] = str(JUPYTER_ROOT / "runtime")
os.environ["IPYTHONDIR"] = str(JUPYTER_ROOT / "ipython")

import nbformat
from nbclient import NotebookClient


notebook_path = ROOT / "research.ipynb"
notebook = nbformat.read(notebook_path, as_version=4)
for index, cell in enumerate(notebook.cells):
    cell.setdefault("id", f"research-{index}")

NotebookClient(
    notebook,
    timeout=180,
    kernel_name="deno",
    allow_errors=False,
).execute(cwd=str(ROOT))
nbformat.write(notebook, notebook_path)
print(f"Executed {sum(cell.cell_type == 'code' for cell in notebook.cells)} Deno code cells.")
