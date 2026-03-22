#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SNAPSHOT_NAME="learntensors-python"

daytona snapshot create "$SNAPSHOT_NAME" \
  --dockerfile "$SCRIPT_DIR/Dockerfile.daytona" \
  --cpu 2 --memory 4 --disk 8

echo "Snapshot '$SNAPSHOT_NAME' created successfully"
