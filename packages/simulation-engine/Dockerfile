# Denna Dockerfile förutsätter att hela monorepot har byggts
# och att byggkontexten är roten av monorepot.

FROM node:22-alpine

WORKDIR /app

# Install 7zip since the 7zip-bin package often has issues with Alpine/musl
RUN apk add --no-cache 7zip

# 1. Kopiera monorepo-konfiguration
COPY package.json package-lock.json ./

# 2. Kopiera interna paket (både definition och byggd kod)
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/shared-utils/dist ./packages/shared-utils/dist

# 3. Kopiera tjänstens definition
COPY packages/simulation-engine/package.json ./packages/simulation-engine/package.json

# 4. Installera beroenden för produktion
RUN npm ci --production

# Ensure 7zip-bin has executable permissions (if it tries to use its own binary)
RUN chmod -R +x /app/node_modules/7zip-bin/linux/x64/7za || true

# 5. Kopiera den förbyggda koden för denna specifika tjänst
COPY packages/simulation-engine/dist ./dist
# Include the tapes and scenarios directories for persistence
COPY packages/simulation-engine/src/tapes ./src/tapes
COPY packages/simulation-engine/src/scenarios ./src/scenarios
COPY packages/simulation-engine/migrations ./migrations

CMD ["node", "dist/src/index.js"]
