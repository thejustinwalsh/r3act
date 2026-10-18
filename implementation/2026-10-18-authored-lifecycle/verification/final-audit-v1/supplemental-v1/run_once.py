import datetime, json, pathlib, subprocess, sys, time

root=pathlib.Path.cwd()
out=root/'implementation/2026-10-18-authored-lifecycle/verification/final-audit-v1/supplemental-v1'
meta=out/'wrapper.json'
if meta.exists():
    print('refusing second supplemental audit: wrapper.json already exists',file=sys.stderr)
    sys.exit(125)
cmd=['python3',str((out/'checks.py').resolve())]
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
t0=time.monotonic()
try:
    p=subprocess.run(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=120)
    rc=p.returncode; stdout=p.stdout; stderr=p.stderr; timed_out=False
except subprocess.TimeoutExpired as e:
    rc=124; stdout=e.stdout or ''; stderr=e.stderr or ''; timed_out=True
(out/'stdout.log').write_text(stdout)
(out/'stderr.log').write_text(stderr)
record={'command':cmd,'cwd':str(root),'startedAt':started,'deadlineSeconds':120,
        'durationSeconds':time.monotonic()-t0,'exitCode':rc,'timedOut':timed_out}
meta.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
sys.exit(rc)
