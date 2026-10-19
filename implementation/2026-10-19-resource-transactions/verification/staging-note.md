# Local integration staging

The complete staged diff check exited 2 because immutable generated package outputs and raw Cargo/Vite logs contain trailing whitespace or a blank line at EOF. Those bytes remain unchanged to preserve their evidence hashes. A separate check covering implementation sources, compiler/scripts, references, reports and live workload sources exited 0. No build, correctness gate or timing was repeated. Documentation/evidence integrity passed before staging.
