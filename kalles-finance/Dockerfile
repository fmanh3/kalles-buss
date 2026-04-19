# Denna Dockerfile förutsätter att hela monorepot har byggts
# och att byggkontexten är roten av monorepot.

FROM node:22-alpine

WORKDIR /app

# Kopiera rotens package.json och package-lock.json
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

# Installera alla beroenden för monorepot
# Använd npm ci för att säkerställa att exakta versioner från package-lock.json används
RUN npm ci

# Kopiera den förbyggda koden för denna specifika tjänst
COPY kalles-finance/dist ./dist

# Kopiera databasmigrationerna
COPY kalles-finance/migrations ./dist/migrations

# Kopiera start-scriptet
COPY kalles-finance/run.sh .

CMD ["./run.sh"]
