# Podman Linux ARM64 verification

The host launcher is `implementation/2026-10-18-native-platforms/linux/run-podman-arm64.mjs`. It uses the unchanged Linux payload and a dedicated `r3act-dev` Podman machine. The current machine has one CPU and 2048 MiB; `machine-proof.json` must attest a running one-CPU AppleHV machine with 2048–4096 MiB of memory and a disk image that resolves under `/Volumes/Depot/Containers/podman`. The earlier 512-MiB boot failure and 1024-MiB verification OOM remain preserved in prior evidence. The launcher never creates or starts the machine.

Run each phase from the repository root, with a fresh `image-podman-*` output and `evidence-podman-*` evidence directory under `implementation/2026-10-18-native-platforms/linux`. Use the same `R3ACT_WORKLOAD_MEMORY_MIB` value for every running phase; it defaults to 1536 and may be explicitly set from 200 MiB up to the proved machine memory minus 512 MiB for its OS and engine. The selected value and machine proof are bound into receipts. Each phase requires `--machine-proof implementation/2026-10-20-podman/machine-proof-2048.json`:

1. `prepare-image --output-dir <image-directory>` creates a digest-locked Node image proof.
2. `bootstrap --image-proof <image-directory>/image-proof.json --evidence-dir <evidence-directory>` creates three labeled named volumes, stages and hashes current source, and installs the Linux toolchain.
3. `verify` runs the consolidated current-source Linux ARM64 gate in the owned workspace.
4. `benchmark-prepare` prepares the frozen installed consumer; `benchmark-run` requires a reviewed `run-authorization.json` tied to its build proof.
5. `archive` preserves evidence after success or failure. `finalize` removes only the three volumes named in the owned-volume receipt after evidence has been reviewed.

The host launcher copies source and evidence through owned named volumes rather than depending on macOS bind sharing. Its temporary transfer directories are under `/Volumes/Depot/Containers/podman/transfers`. Per-container limits are one CPU and the recorded memory cap; the machine cap is separate. This run is a local AppleHV Linux VM observation, not independent-device evidence.
