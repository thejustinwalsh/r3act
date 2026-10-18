# Package consumer v2 source and mode receipt

These files are exact source copies before the executable-mode repair. SHA-256:

| File | SHA-256 |
| --- | --- |
| `build_r3act_packages.mjs` | `973329e3f156f0cd41f57a96a869815f3043c5ac898f11011d895595f2d0573b` |
| `verify_r3act_packages.mjs` | `305062e889015be00ca128d4b164edf28373798a1d2c043aa58881245d0c9103` |

The staged binary in `.cache/r3act-package-build/vite/dist/compiler/bin/darwin-arm64/` was mode `-rwxr-xr-x`. The same binary entry inside `r3act-vite.tgz` was mode `-rw-r--r--`; `tar -tvf` reported `-rw-r--r-- 0 0 3128720` for `package/dist/compiler/bin/darwin-arm64/ui-graph-compiler-spike`. The installed consumer therefore failed at process start with `EACCES`, recorded in `verification/package-consumer-v2.log`. The package build and complete pre-repair artifacts remain archived at `verification/packaging-v1/`.
