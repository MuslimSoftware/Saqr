#!/usr/bin/env sh
set -euo pipefail

# Create Google credentials file from JSON env var stored in Coolify
if [ "${GOOGLE_CREDENTIALS_JSON-}" ]; then
  mkdir -p /run/secrets
  # Avoid newline/escape surprises
  printf '%s' "$GOOGLE_CREDENTIALS_JSON" > /run/secrets/gcp-key.json
  chmod 0400 /run/secrets/gcp-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-key.json
fi

# Hand off to the real server process (PID 1 signal-friendly)
exec "$@"


