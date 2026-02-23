FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ .

# Copy SQL schema so database.js can find it at /database/init.sql
COPY database/init.sql /database/init.sql

EXPOSE 5001
CMD ["node", "server.js"]
