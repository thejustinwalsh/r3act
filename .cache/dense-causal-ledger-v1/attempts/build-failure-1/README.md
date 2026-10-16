# Preserved first build attempt

This directory contains the exact tooling, snapshot and source manifest used for Luna's successful synthetic protocol gate and failed one-shot Vite build. The build stopped during config loading because the smaller derived-array source archive did not contain `compiler/host_jsx_declarations.ts`, which the archived `compiler/vite_native_plugin.ts` imports. It produced no build lock and no production build output. Raw gate output and hashes remain in `../../tooling-gates/`; none of these inputs should be overwritten or used for collection.
