#!/usr/bin/env sh
set -e

# Prepare Google credentials if provided via env var (Coolify-friendly)
if [ -n "$GOOGLE_CREDENTIALS_BASE64" ]; then
  mkdir -p /secrets
  echo "$GOOGLE_CREDENTIALS_BASE64" | base64 -d > /secrets/google_key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/secrets/google_key.json
elif [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  mkdir -p /secrets
  echo "$GOOGLE_CREDENTIALS_JSON" > /secrets/google_key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/secrets/google_key.json
fi

# If no command is provided, start uvicorn using env vars (with sane defaults)
if [ "$#" -eq 0 ]; then
  HOST_VALUE="${HOST:-0.0.0.0}"
  PORT_VALUE="${PORT:-8000}"
  exec uvicorn app.main:app --host "$HOST_VALUE" --port "$PORT_VALUE"
fi

exec "$@"


