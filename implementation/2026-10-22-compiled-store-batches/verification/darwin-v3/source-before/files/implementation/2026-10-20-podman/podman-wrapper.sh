#!/bin/sh
export XDG_CONFIG_HOME=/Users/mini/.config/podman-depot
export XDG_DATA_HOME=/Volumes/Depot/Containers/podman/data
export XDG_CACHE_HOME=/Volumes/Depot/Containers/podman/cache
export TMPDIR=/Volumes/Depot/Containers/podman/tmp
export CONTAINERS_MACHINE_PROVIDER=applehv
exec /opt/homebrew/bin/podman "$@"
