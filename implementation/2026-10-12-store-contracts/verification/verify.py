from pathlib import Path
import subprocess,json,os
base=Path('.cache/store-matrix-milestone');env=os.environ|{'CARGO_HOME':str(Path('.cache/cargo').resolve())}
commands=[('deno',['deno','test','--config','deno.browser.json','src']),('rust',['cargo','test','--manifest-path','compiler/oxc-spike/Cargo.toml']),('smoke',['pnpm','compiler:native:smoke']),('typecheck',['deno','check','--config','deno.browser.json','src/native_runtime_api.ts','src/native_task_execution.ts','src/native_task_transition.ts','src/browser/native_task_transitions.tsx','src/native_task_generation_lease_test.ts','src/store_projection_matrix_test.ts','src/store_scope_contract_test.ts','src/native_task_store_matrix_test.ts']),('build',['pnpm','build'])]
for stem in ['state','store','collection','root_queue','resource','task_transition']:commands.append(('execution-'+stem,['node','--experimental-transform-types','compiler/native_'+stem+'_execution_test.mjs']))
for stem in ['owner_preparation','native_candidate','native_resource']:commands.append(('retention-'+stem,['node','--expose-gc','--experimental-transform-types','scripts/verify_'+stem+'_retention.mjs']))
commands += [('dom-browser',['node','--experimental-transform-types','scripts/verify_dom_input_contract.mjs']),('input-browser',['node','scripts/verify_native_input_transition_contract.mjs']),('browser',['node',str(base/'browser-check.mjs')]),('hmr',['node',str(base/'hmr-check.mjs')]),('resource-regression',['node',str(base/'resource-regression/browser-check.mjs')])]
results=[]
for name,cmd in commands:
 with (base/(name+'.log')).open('w') as out:r=subprocess.run(cmd,stdout=out,stderr=subprocess.STDOUT,env=env,timeout=120)
 results.append({'name':name,'command':cmd,'exitCode':r.returncode});(base/'commands.json').write_text(json.dumps(results,indent=2)+'\n')
 print(name,'PASS' if r.returncode==0 else 'FAIL',flush=True)
 if r.returncode:raise SystemExit(r.returncode)
