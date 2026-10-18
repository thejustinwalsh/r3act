#!/bin/zsh
set -eu
cd /Volumes/Depot/Developer/r3act
unset CARGO_TARGET_DIR CARGO_BUILD_TARGET
export PATH=/Users/mini/.local/share/mise/installs/node/24.18.0/bin:$PATH
export R3ACT_SOURCE_COMMIT=efba5eed895bb783b7e4ba2398ccf70b6ed168c9
exec /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-18-store-projections/verification/darwin-v2 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
