#!/bin/sh
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
BINARY=${COMPOZY_BINARY:-$HOME/compozy-os/bin/compozy}
TAG=${FLOW_RUNTIME_TAG:-localhost/flow-spec-runtime:dev}

cp "$BINARY" "$HERE/compozy"
podman build -t "$TAG" -f "$HERE/Containerfile" "$HERE"
DIGEST=$(podman inspect --format '{{.Digest}}' "$TAG")
REPOSITORY=${TAG%:*}
echo "SPEC_RUNTIME_IMAGE=$REPOSITORY@$DIGEST"
