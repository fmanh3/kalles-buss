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
COPY packages/kalles-hr/package.json ./packages/kalles-hr/package.json

# 4. Installera alla beroenden för monorepot i produktion
RUN npm ci --production

# 5. Kopiera den förbyggda koden och skript för denna specifika tjänst
COPY packages/kalles-hr/dist ./dist
COPY packages/kalles-hr/run.sh .

# 6. Säkerställ att startskriptet är körbart
RUN chmod +x run.sh

CMD ["./run.sh"]
