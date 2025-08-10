#!/usr/bin/env sh
# POSIX sh doesn't support 'pipefail'; use -e -u only
set -eu

echo "[entrypoint] Starting container..."

# Create Google credentials file from JSON env var stored in Coolify
if [ -n "${GOOGLE_CREDENTIALS_JSON:-}" ]; then
  mkdir -p /run/secrets
  # Avoid newline/escape surprises
  printf '%s' "$GOOGLE_CREDENTIALS_JSON" > /run/secrets/gcp-key.json
  chmod 0400 /run/secrets/gcp-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-key.json
  echo "[entrypoint] Wrote Google credentials to /run/secrets/gcp-key.json"
else
  echo "[entrypoint] GOOGLE_CREDENTIALS_JSON not provided; skipping credentials file"
fi

# If no command is provided, run uvicorn with sensible defaults
if [ "$#" -eq 0 ]; then
  DEFAULT_PORT=${PORT:-8000}
  set -- uvicorn app.main:app --host 0.0.0.0 --port "$DEFAULT_PORT" --log-level info
fi

# Hand off to the real server process (PID 1 signal-friendly)
echo "[entrypoint] Exec: $@"
exec "$@"


