#!/bin/zsh
set -eu
cd /Volumes/Depot/Developer/r3act
exec /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-18-store-projections/benchmark/run-pair.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-18-store-projections/benchmark/proof-v1 --origin https://store-projections-proof.localhost
