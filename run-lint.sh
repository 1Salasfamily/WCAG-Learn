#!/usr/bin/env zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$ROOT/.local/node/bin:$PATH"
exec npm run lint
