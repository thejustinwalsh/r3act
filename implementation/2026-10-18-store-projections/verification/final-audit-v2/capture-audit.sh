#!/bin/zsh
set -u
cd /Volumes/Depot/Developer/r3act
set +e
./implementation/2026-10-18-store-projections/verification/final-audit-v2/exact-command.sh > implementation/2026-10-18-store-projections/verification/final-audit-v2/raw.stdout.log 2> implementation/2026-10-18-store-projections/verification/final-audit-v2/raw.stderr.log
run_exit=$?
printf '%s\n' "$run_exit" > implementation/2026-10-18-store-projections/verification/final-audit-v2/tool-exit-code.txt
exit "$run_exit"
