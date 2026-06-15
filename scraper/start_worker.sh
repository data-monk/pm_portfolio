#!/usr/bin/env bash
# Start the Celery scrape+commute worker, loading env from server/.env
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../server/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

# Export every non-comment line from server/.env
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

cd "$SCRIPT_DIR"

echo "Starting Celery worker (queues: scrape, commute)..."
echo "  CS_POSTGRES_DSN = $CS_POSTGRES_DSN"
echo "  CS_REDIS_URL    = $CS_REDIS_URL"
echo ""

python3 -m celery -A celery_app worker \
  -Q scrape,commute \
  --loglevel=info \
  --concurrency=2
