#!/usr/bin/env bash
# Render youtube-studio/config/config.toml from config.toml.example, substituting
# the ${...} placeholders with values from youtube-studio/.env.
#
# Run this after every .env change: the renderer reads config.toml, not .env.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "error: youtube-studio/.env is missing. Copy .env.template to .env and fill it in." >&2
  exit 1
fi

if ! command -v envsubst >/dev/null 2>&1; then
  echo "error: envsubst not found (Debian/Ubuntu: apt-get install gettext-base)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p config
envsubst < config/config.toml.example > config/config.toml
chmod 600 config/config.toml

echo "Wrote config/config.toml (Pexels, ElevenLabs and the optional API key filled from .env)."
echo "Now run: docker compose up -d"
