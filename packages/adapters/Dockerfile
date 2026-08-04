# Denna Dockerfile förutsätter att hela monorepot har byggts
# och att byggkontexten är roten av monorepot.

FROM node:22-alpine

WORKDIR /app

# 1. Kopiera monorepo-konfiguration
COPY package.json package-lock.json ./

# 2. Kopiera interna paket (både definition och byggd kod)
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/shared-utils/dist ./packages/shared-utils/dist

# 3. Kopiera tjänstens definition
COPY packages/adapters/package.json ./packages/adapters/package.json

# 4. Installera beroenden för produktion
RUN npm ci --production

# 5. Kopiera den förbyggda koden för denna specifika tjänst
COPY packages/adapters/dist ./dist

# 6. Kopiera vår sparade "Golden Master" data för att slippa bränna API-kvoter
COPY packages/adapters/src/local_archives ./dist/local_archives

# 7. Starta tjänsten
CMD ["node", "dist/index.js"]
