#!/bin/zsh
set -u
cd /Volumes/Depot/Developer/r3act
set +e
./implementation/2026-10-18-store-projections/verification/final-audit-v1/exact-command.sh > implementation/2026-10-18-store-projections/verification/final-audit-v1/raw.stdout.log 2> implementation/2026-10-18-store-projections/verification/final-audit-v1/raw.stderr.log
run_exit=$?
printf '%s\n' "$run_exit" > implementation/2026-10-18-store-projections/verification/final-audit-v1/tool-exit-code.txt
exit "$run_exit"
