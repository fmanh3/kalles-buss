FROM node:22-alpine

WORKDIR /app

# Install dependencies for the specific service
WORKDIR /app/kalles-hr
COPY kalles-hr/package*.json ./
RUN npm install --legacy-peer-deps

# Copy the entire monorepo so cross-repo relative imports work
WORKDIR /app
COPY kalles-hr ./kalles-hr
COPY kalles-finance ./kalles-finance
COPY kalles-traffic ./kalles-traffic

WORKDIR /app/kalles-hr
CMD ["npm", "start"]
