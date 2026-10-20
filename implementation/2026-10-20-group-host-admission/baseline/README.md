# Old-source group admission characterization

`source/src/` is a Git archive of commit `33209ecef0e50114b01edd3618b20e99ef4287ac`, before the group admission change. `source-manifest.json` records the SHA-256 hash and byte length of all 328 archived source files. Its canonical `sha256  path\n` manifest digest is `fea58441e1004235f917f711d5717162b247a1189c50085ca89cf60c1e99f6e3`.

The preserved `characterization.mjs` v1 was ineligible for a scoped keyed move: its mapper returned an intrinsic `li`, while the old scoped row path requires a component owner with a stable site ID. Its archived failed receipt stopped before queue validation callbacks and is a fixture setup failure, not evidence for or against the admission defect. The script and its receipt remain unchanged.

`characterization-v2.mjs` copies v1 with a stable `Row` component in the collection mapper, matching the existing passing scoped transaction fixtures. It imports only the archived source. The late `getOwnPropertyDescriptor("setProp")` trap in the first keyed root updates a retained cell in the second root after the queue's final public validation and before the first root's host application. On the old modules, the expected defect is a first-root host placement before the second member declines, with both accepted publication versions old and a partial group failure. This is a characterization assertion, not a new correctness expectation; its behavior remains unverified until the bounded run.

The v2 script is prepared for a separate bounded run and has not been executed during its source correction. Use `node --experimental-transform-types implementation/2026-10-20-group-host-admission/baseline/characterization-v2.mjs` under the supervisor. Preserve the v1 failure separately.
