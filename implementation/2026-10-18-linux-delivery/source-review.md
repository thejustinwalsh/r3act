# Linux delivery source review

Primary reviewed the complete Docker launcher, shared container staging, native-platform runner and installed Vite build protocol. A separate Sol medium read-only reviewer found no additional execution blocker. This is source review, not platform PASS.

The two staging selections include the current 22-fixture corpus and authored lifecycle workload. Bootstrap compares its full copied input list to the captured host snapshot. Actual Docker daemon/image identity, source lock, toolchain proof and launcher hash govern later phases. The source volume is read-only during execution; generated output remains in owned Linux volumes. Exact source and package hashes govern the existing native-platform runner, which uses frozen dependency inputs and checks actual executable target metadata rather than crediting synthetic labels.

Phase and transfer containers have unique ownership labels and names. Timeout cleanup inspects the exact label before removal; transfer errors retain the original failure with separate cleanup errors. The source review corrected an initially unnamed free-space helper and ensured logs finish before host receipts finalize. Disk availability is measured on the actual Docker workspace filesystem; no per-volume quota is claimed. Partial initial volume creation can leave labelled volumes for manual inspection if setup fails before the host phase receipt; the ownership record is written first and shared resources are never pruned.

The build comparison remains gated after correctness and primary inspection of actual installed Native/React transforms, package/compiler hashes and emitted assets. A hash-bound authorization and exclusive one-shot receipt prevent favorable timing retries. The required proof builds are untimed and may prime caches. Local Linux VM execution is not independent hardware, Windows coverage, hosted CI execution, cold-cache setup or runtime performance qualification. Apple Container remains independently pending its existing macOS authorization.

Luna is released for image preparation, toolchain bootstrap and one consolidated Linux correctness gate only. Primary will review the result before releasing proof preparation or timing. Historical cache evidence on the host is not executed or modified by the Linux workspace.

## Preserved v1 compiler provenance failure

The first actual Linux gate failed its unchanged-compiler check at compiled-07: the fixture exited 0, but the debug executable changed from `4669a3e55c0a49253b2e3592137890549e06d42a7bc51a12efa1ba9efe97376b` to `4ccb641e7c0d65c3eaf54de0bd03267cc4e402382764e3d9d53184751ae9ad4f`. All other steps passed and the 829-input source audit matched. The original FAIL remains authoritative for that run. No timing was attempted.

Source inspection shows five older compiled fixtures chose the default checkout plugin path. That path invokes Cargo with checkout `.cache/cargo`, whereas the runner had already built and identified the explicit debug executable under the pinned toolchain Cargo home. The fixtures now pass the same explicit debug path as the rest of the execution corpus. They still compile and execute real Rust/OXC output; default checkout build behavior remains in its own plugin/artifact coverage. No assertion, compiler identity check, hash-stability guard or runtime implementation was weakened.

Primary reviewed exactly those five option changes, preserving the old source archive and failed receipt. Luna is released for a fresh v2 workspace/bootstrap and consolidated gate. This is a correction to execution provenance, not a favorable timing retry; the first comparison remains unreleased.
