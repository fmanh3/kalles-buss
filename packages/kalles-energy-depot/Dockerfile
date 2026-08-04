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
COPY packages/kalles-energy-depot/package.json ./packages/kalles-energy-depot/package.json

# 4. Installera beroenden för produktion
RUN npm ci --production

# 5. Kopiera tjänstens byggda kod och skript
COPY packages/kalles-energy-depot/dist ./dist
COPY packages/kalles-energy-depot/knexfile.cjs ./dist/
COPY packages/kalles-energy-depot/run.sh .

# 6. Säkerställ att startskriptet är körbart
RUN chmod +x run.sh

CMD ["./run.sh"]