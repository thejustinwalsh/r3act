import os, subprocess, json, hashlib
from pathlib import Path
root=Path.cwd()
command=["/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node", "implementation/2026-10-18-joint-async-inputs/benchmark/build-gate.mjs", "--proof-dir", "/Volumes/Depot/Developer/r3act/implementation/2026-10-18-joint-async-inputs/benchmark/proof-v2"]
env=os.environ.copy()
env["PATH"]="/Users/mini/.local/share/mise/installs/node/24.18.0/bin:"+env.get("PATH", "")
env.pop("CARGO_TARGET_DIR", None); env.pop("CARGO_BUILD_TARGET", None)
assert not Path(command[-1]).exists(), "proof-v2 must not exist before launch"
result=subprocess.run(command,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
out=Path("implementation/2026-10-18-joint-async-inputs/verification/benchmark-build-v2")
(out/"stdout.log").write_bytes(result.stdout); (out/"stderr.log").write_bytes(result.stderr)
(out/"command.json").write_text(json.dumps({"cwd":str(root),"command":command,"nodeVersion":subprocess.check_output([command[0],"--version"],env=env,text=True).strip(),"unset":["CARGO_TARGET_DIR","CARGO_BUILD_TARGET"],"exitCode":result.returncode,"stdoutBytes":len(result.stdout),"stderrBytes":len(result.stderr),"stdoutSha256":hashlib.sha256(result.stdout).hexdigest(),"stderrSha256":hashlib.sha256(result.stderr).hexdigest()},indent=2)+"\n")
print(f"exit={result.returncode} stdout={len(result.stdout)} stderr={len(result.stderr)}")
raise SystemExit(result.returncode)
