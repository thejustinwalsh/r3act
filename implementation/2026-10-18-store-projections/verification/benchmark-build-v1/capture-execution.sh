#!/bin/zsh
set -u
cd /Volumes/Depot/Developer/r3act
set +e
./implementation/2026-10-18-store-projections/verification/benchmark-build-v1/exact-command.sh > implementation/2026-10-18-store-projections/verification/benchmark-build-v1/runner.stdout.log 2> implementation/2026-10-18-store-projections/verification/benchmark-build-v1/runner.stderr.log
status=$?
printf '%s\n' "$status" > implementation/2026-10-18-store-projections/verification/benchmark-build-v1/tool-exit-code.txt
exit "$status"
