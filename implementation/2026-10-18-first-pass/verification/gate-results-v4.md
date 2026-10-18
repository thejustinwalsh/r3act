# Consumer gate receipt v4

Status: **FAILED.** Source inventory: `source-lock-v4.json` captures the approved pnpm 11 workspace-override correction before the one consumer-only retry. The package builder and tarballs remain the unchanged v1 artifacts archived in `packaging-v1/`.

The retry resolved all local `@r3act/*` packages from their tarballs and reached the fresh Vite consumer build. It failed when the Vite plugin tried to launch the packaged `@r3act/vite/dist/compiler/bin/darwin-arm64/ui-graph-compiler-spike`: the operating system returned `EACCES`. Raw output: `package-consumer-v2.log`. The earlier registry 404 remains recorded in `package-consumer-v1.log`.

This retry was consumer verification only. No package rebuild, benchmark build, or browser pair was run.
