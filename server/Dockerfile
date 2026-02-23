FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
