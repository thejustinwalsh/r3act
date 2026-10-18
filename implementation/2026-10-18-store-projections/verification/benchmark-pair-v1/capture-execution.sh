#!/bin/zsh
set -u
cd /Volumes/Depot/Developer/r3act
set +e
./implementation/2026-10-18-store-projections/verification/benchmark-pair-v1/exact-command.sh > implementation/2026-10-18-store-projections/verification/benchmark-pair-v1/runner.stdout.log 2> implementation/2026-10-18-store-projections/verification/benchmark-pair-v1/runner.stderr.log
run_exit=$?
printf '%s\n' "$run_exit" > implementation/2026-10-18-store-projections/verification/benchmark-pair-v1/tool-exit-code.txt
exit "$run_exit"
