# Disposable Linux test infrastructure: corrected layout

Basis: r3act main `fe9a2c73f5e082fe20043d1fe4faf6fa682c059f`. This is a host installation correction, not a runtime/compiler change or product qualification.

The user requires binaries and launchd service configuration on the system drive, with VM disks, images, volumes, caches and logs on Depot. Instances are disposable development/test workloads, removed after verification; retaining a downloaded image cache does not require retaining instances. The earlier Depot-root chmod request is withdrawn. Do not execute it, launch another administrator prompt or modify Depot permissions to bypass the layout requirement.

## Completed change

The released Apple Container 1.5.0 installation was copied with `ditto` from `/Volumes/Depot/Containers/apple/tooling/1.5.0` to `/Users/mini/.local/share/apple-container/1.5.0`. The user wrapper now selects the local installation root; its app/data and log roots remain on Depot. Original binaries and data were preserved. The previous wrapper is saved at `/Volumes/Depot/Containers/apple/setup/wrapper-before-local-binaries.sh`.

[Installation receipt](local-binary-install.json) records all 17 copied files, totaling 443600248 bytes. SHA-256: `8106877f9d91c44ff13c359c2a64ac335aab7350c2abbde07e1f16d23b4c6ac8`. The wrapper SHA is `61aad28a0918d6347fed2c6fdd47699f0d338831b44a04e006f2bdcddcce21b8`.

Luna performed bounded read-only verification: wrapper shell syntax and version commands exited zero; version is 1.5.0/d265d66; all 17 installed file sizes/hashes match; strict code-signature verification succeeds for all seven executables. These are installation checks, not Linux test results. Depot remains root:wheel/0775 and both saved memory configuration hashes remain `e70aa724745aea6808994e8ed31091894339b623543e51b4e57f453878586e7d`: one CPU, 256 MiB/container, 512 MiB/builder, Rosetta disabled. No service, VM, server, build or benchmark was started; effective VM caps remain unverified.

## Remaining limit and scope

Pinned upstream 1.5.0 source registers even ephemeral container runtimes with launchd. `ContainersService` supplies the container bundle as plugin state root; `PluginLoader` writes `service.plist` there, and `ServiceManager` bootstraps it. The same bundle holds `rootfs.ext4`, `initfs.ext4` and `kernel.bin`. Shutdown/delete bootouts by label: launchd supervision does not imply a durable instance or boot-time persistence.

The [prior pinned source archive](../2026-10-20-portability-admission/evidence/apple-1.5.0/manifest.json) remains the source authority. Separating both API and dynamic per-VM service files requires changing both plist generation paths, not only copying the API plist. A custom Apple build is outside this disposable test task and has not been made. Service plist separation is UNRESOLVED; the desired full installation layout is not claimed complete. Do not restore the withdrawn chmod request or treat system-drive binaries as proof that all services are local.

The intended test remains: start one low-memory instance, run current-source Linux checks, then remove the instance and temporary workspace. No such run has occurred. Current platform verification, second-physical-device replication and the master plan's performance/cold/memory acceptance remain open. Historic wins, qualified dense FAIL, exhausted Recording A, physical HOLD and the incomplete allocation pair retain their scope. This correction neither narrows nor completes the full product goal.
