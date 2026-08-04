#!/bin/sh
set -e

echo "--- [kalles-traffic] Forcing Migrations ---"
npx knex migrate:latest --knexfile dist/knexfile.js --env production

echo "--- [kalles-traffic] Starting Application ---"
NODE_ENV=production node dist/src/index.js


