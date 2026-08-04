#!/bin/sh
set -e

echo "--- [kalles-finance] Forcing Migrations ---"
NODE_ENV=production npx knex migrate:unlock --knexfile dist/knexfile.js --env production && NODE_ENV=production npx knex migrate:latest --knexfile dist/knexfile.js --env production

echo "--- [kalles-finance] Starting Application ---"
NODE_ENV=production node dist/src/index.js


