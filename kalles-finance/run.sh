#!/bin/sh
set -e

echo "--- [kalles-finance] Running Database Migrations ---"
npx knex migrate:latest --knexfile dist/knexfile.js

echo "--- [kalles-finance] Starting Application ---"
node dist/index.js
