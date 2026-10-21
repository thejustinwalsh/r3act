# Podman Linux ARM64 verification

The host launcher is `implementation/2026-10-18-native-platforms/linux/run-podman-arm64.mjs`. It uses the unchanged Linux payload and a dedicated `r3act-dev` Podman machine. The required `machine-proof.json` must first attest a running one-CPU, 1024-MiB AppleHV machine whose disk image resolves under `/Volumes/Depot/Containers/podman`. The earlier 512-MiB machine boot failed during initramfs unpack and remains preserved in the machine setup evidence. The launcher never creates or starts the machine.

Run each phase from the repository root, with a fresh `image-podman-*` output and `evidence-podman-*` evidence directory under `implementation/2026-10-18-native-platforms/linux`. Use the same `R3ACT_WORKLOAD_MEMORY_MIB` value for every running phase; it defaults to 256 and may be explicitly set between 200 and 768, reserving 256 MiB of the proved machine memory for its OS and engine. The selected value and machine proof are bound into receipts. Each phase requires `--machine-proof implementation/2026-10-20-podman/machine-proof.json`:

1. `prepare-image --output-dir <image-directory>` creates a digest-locked Node image proof.
2. `bootstrap --image-proof <image-directory>/image-proof.json --evidence-dir <evidence-directory>` creates three labeled named volumes, stages and hashes current source, and installs the Linux toolchain.
3. `verify` runs the consolidated current-source Linux ARM64 gate in the owned workspace.
4. `benchmark-prepare` prepares the frozen installed consumer; `benchmark-run` requires a reviewed `run-authorization.json` tied to its build proof.
5. `archive` preserves evidence after success or failure. `finalize` removes only the three volumes named in the owned-volume receipt after evidence has been reviewed.

The host launcher copies source and evidence through owned named volumes rather than depending on macOS bind sharing. Its temporary transfer directories are under `/Volumes/Depot/Containers/podman/transfers`. Per-container limits are one CPU and the recorded memory cap; the machine cap is separate. This run is a local AppleHV Linux VM observation, not independent-device evidence.
