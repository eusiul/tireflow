FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY DATABASE_SCHEMA.sql ./DATABASE_SCHEMA.sql

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/DATABASE_SCHEMA.sql ./DATABASE_SCHEMA.sql

EXPOSE 3003

CMD ["sh", "-c", "node dist/db/init.js && node dist/main.js"]
