#!/bin/zsh
set -eu
cd /Volumes/Depot/Developer/r3act
unset CARGO_TARGET_DIR CARGO_BUILD_TARGET
export PATH=/Users/mini/.local/share/mise/installs/node/24.18.0/bin:$PATH
export R3ACT_SOURCE_COMMIT=dab3f49b7b7925964e357491520b3a2c9fed66d4
exec /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-18-store-values/verification/darwin-v2 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
