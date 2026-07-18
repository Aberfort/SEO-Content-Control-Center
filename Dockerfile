# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/marketing/package.json apps/marketing/package.json
COPY apps/saas/package.json apps/saas/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/gsc/package.json packages/gsc/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS builder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_MARKETING_URL=http://localhost:3001
ENV NODE_ENV=production \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_MARKETING_URL=${NEXT_PUBLIC_MARKETING_URL}
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_CACHE=/tmp/.npm
COPY --from=builder --chown=node:node /app /app
USER node

FROM runtime AS saas
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@sccc/saas"]

FROM runtime AS marketing
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@sccc/marketing"]

FROM runtime AS worker
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@sccc/worker"]

FROM runtime AS migrate
CMD ["npm", "run", "db:migrate:deploy"]
