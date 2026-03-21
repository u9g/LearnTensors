#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TY_WASM_DIR="$PROJECT_DIR/src/ty_wasm"

if [ -f "$TY_WASM_DIR/ty_wasm_bg.wasm" ]; then
  echo "ty_wasm already built at $TY_WASM_DIR"
  echo "To rebuild, delete $TY_WASM_DIR and re-run."
  exit 0
fi

RUFF_DIR="/tmp/ruff-ty-build"
if [ ! -d "$RUFF_DIR" ]; then
  echo "Cloning ruff repository (shallow)..."
  git clone --depth 1 https://github.com/astral-sh/ruff.git "$RUFF_DIR"
else
  echo "Using existing ruff clone at $RUFF_DIR"
fi

echo "Building ty_wasm with wasm-pack..."
cd "$RUFF_DIR"
wasm-pack build crates/ty_wasm --target web --out-dir "$TY_WASM_DIR"

# Remove files we don't need
rm -f "$TY_WASM_DIR/.gitignore" "$TY_WASM_DIR/package.json" "$TY_WASM_DIR/README.md"

echo "Done! ty_wasm built at $TY_WASM_DIR"
