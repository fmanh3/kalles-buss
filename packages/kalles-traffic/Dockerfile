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
COPY packages/kalles-traffic/package.json ./packages/kalles-traffic/package.json

# 4. Installera beroenden för produktion
# Vi installerar från roten så att workspaces länkas korrekt av npm självt
RUN npm ci --production

# 5. Kopiera tjänstens byggda kod och skript
COPY packages/kalles-traffic/dist ./dist
COPY packages/kalles-traffic/run.sh .

# 6. Säkerställ att startskriptet är körbart
RUN chmod +x run.sh

CMD ["./run.sh"]
