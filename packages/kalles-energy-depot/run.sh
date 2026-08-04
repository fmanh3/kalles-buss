#!/bin/sh
set -e

echo "--- [kalles-energy-depot] Forcing Migrations ---"

NODE_ENV=production npx knex migrate:unlock --knexfile dist/knexfile.cjs --env production && NODE_ENV=production npx knex migrate:latest --knexfile dist/knexfile.cjs --env production

echo "--- [kalles-energy-depot] Starting Application ---"
NODE_ENV=production node dist/src/index.js


