#!/bin/sh
if [ "${1-}" = "install" ] && [ "${PWD-}" != "/Volumes/Depot/Developer/r3act" ]; then
  exec /Users/mini/.local/share/mise/installs/node/26/bin/pnpm --store-dir /Volumes/Depot/Developer/r3act/.pnpm-store "$@"
fi
exec /private/tmp/radix-dialog-darwin-v1-bin/pnpm "$@"
