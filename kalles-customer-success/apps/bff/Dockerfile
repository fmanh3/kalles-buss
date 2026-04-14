FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# BFF körs via ts-node i labbet för enkelhet
CMD ["npx", "ts-node", "src/index.ts"]
