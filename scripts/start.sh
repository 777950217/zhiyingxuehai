#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

run_smoke_test() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Running smoke test..."
    node scripts/smoke-test.mjs "http://localhost:${DEPLOY_RUN_PORT}" || true
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."

# Start service in background, run smoke test once ready
start_service &
SERVER_PID=$!

# Wait for service to be ready (max 30s)
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "" "http://localhost:${DEPLOY_RUN_PORT}" 2>/dev/null; then
        echo "Service is ready after ${i}s"
        break
    fi
    sleep 1
done

# Run smoke test
run_smoke_test

# Bring server back to foreground
wait $SERVER_PID
