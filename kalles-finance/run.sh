#!/bin/sh
set -e

# Ensure we use production config if running in Cloud Run
if [ -n "$K_SERVICE" ]; then
  export NODE_ENV=production
fi

echo "--- [kalles-finance] Environment: $NODE_ENV ---"

echo "--- [kalles-finance] Running Database Migrations ---"
npx knex migrate:latest --knexfile dist/knexfile.js --env production

echo "--- [kalles-finance] Starting Application ---"
node dist/src/index.js
