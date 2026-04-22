#!/usr/bin/env bash
# =============================================================================
# mac-open.sh — BoxLang Starter Desktop (macOS)
#
# This script removes the macOS quarantine flag from the app and opens it.
# See UNSIGNED-BUILD.md in this folder for why this is needed.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="BoxLang Starter Desktop.app"
APP_PATH="$SCRIPT_DIR/$APP_NAME"

if [ ! -d "$APP_PATH" ]; then
  echo "❌  Could not find '$APP_NAME' next to this script."
  echo "    Make sure mac-open.sh is in the same folder as the .app bundle."
  exit 1
fi

echo "⚡ BoxLang Starter Desktop — removing quarantine flag..."
xattr -cr "$APP_PATH"

echo "✅  Done. Launching app..."
open "$APP_PATH"
