# Packet A minified delivery proof repair

The full Darwin-v4 gate passed all 79 phases (107 Rust, 1286 Deno, 59 actual compiled fixtures). The preserved [proof-canvas-v3 browser result](proof-canvas-v3/canvas-proof-one-shot.json) is INCOMPLETE at `consumer/verify.mjs:213`: baseline Native captured 257 verified rows in three batch calls, while minified Native reported zero direct captures and fell back to interpretation. The [minified compiler capture](proof-canvas-v3/delivery/minified/capture-native.json) still records execution schema 3 and emitted `batchKernel` for the selected programs. No performance result follows from this delivery failure.

The saved [minified native asset](proof-canvas-v3/delivery/minified/dist/native/assets/native-B4YmdiZ6.js) contains these kernel bodies (spacing omitted):

`Marker: (e,t,n,r)=>{for(let t=0;t<r;t++){let r=n[t];r[1]=e[0]}}`

`Position: (e,t,n,r)=>{let i=e[0]*1e-4,a=e[0]*.005,o=e[0]*.01;for(let e=0;e<r;e++){let r=n[e];r[0]=o+t[e*1+0],r[1]=a+t[e*1+0]*.5,r[2]=i+t[e*1+0]*.01}}`

The parser rejected both at `loop-init`: the minifier reused a formal input name for the `let` loop index. If that check alone were removed, the following `let r=n[index]` would still be rejected as a local collision with the row-count formal. Those rejection codes follow from the saved source and parser control flow; the browser capture did not record individual proof reasons.

The proof now permits exactly these lexical bindings: a `let` loop index may shadow a shared or varying input formal, and a `let` row-output alias may shadow the row-count formal inside the loop body. An in-body reference to either shadowed input spelling is rejected before input lookup; the row-output alias cannot be used as an arithmetic read. `var` collisions remain rejected because they would change function-scoped bindings. Output alias recognition still requires `outputs[row]`, complete writes at exact full prop indices, and the original strict loop bound/unit step. The existing graph comparison still checks every arithmetic tree against the normalized host, including exponent notation and removed redundant parentheses. Calls, early exits, input mutation, output reads, forged capabilities and unexpected statements remain rejected.

Focused proof regressions use the exact saved Marker and Position expression forms and reject `var` shadows and attempted reads through shadowed input names. No compiler emission, runtime capture, host publication or proof capability code changed. This source repair is unverified until primary review and Luna's next complete gate plus installed delivery proof; no packet-specific tests/builds/benchmarks were run.
