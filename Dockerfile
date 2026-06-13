# syntax = docker/dockerfile:1
# Multi-stage build for the React Router 7 server (deployed to Fly.io).
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# --- deps: full install for the build ---
FROM base AS deps
COPY package.json pnpm-lock.yaml* .npmrc ./
RUN pnpm install --frozen-lockfile=false --prod=false

# --- build: compile the app ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- prod deps only ---
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml* .npmrc ./
RUN pnpm install --frozen-lockfile=false --prod=true

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
EXPOSE 3000
CMD ["pnpm", "start"]
