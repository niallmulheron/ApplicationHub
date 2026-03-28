# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JS from build stage
COPY --from=build /app/dist ./dist

# Copy migrations so db:migrate can run in production
COPY src/db/migrations ./src/db/migrations

EXPOSE 3001

CMD ["node", "dist/index.js"]
