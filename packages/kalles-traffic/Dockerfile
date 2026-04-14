FROM node:22-alpine

WORKDIR /app

WORKDIR /app/kalles-traffic
COPY kalles-traffic/package*.json ./
RUN npm install --legacy-peer-deps

WORKDIR /app
COPY kalles-traffic ./kalles-traffic
COPY kalles-finance ./kalles-finance

WORKDIR /app/kalles-traffic
CMD ["npm", "start"]
