# ---- Build Stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/telemetry-contracts/package.json packages/telemetry-contracts/
COPY apps/telemetry-api/package.json apps/telemetry-api/

RUN pnpm install --frozen-lockfile --filter @ai-ops/telemetry-api --prod

# Source
COPY packages/telemetry-contracts/src packages/telemetry-contracts/src
COPY apps/telemetry-api/src apps/telemetry-api/src
COPY packages/telemetry-contracts/tsconfig.json packages/telemetry-contracts/
COPY apps/telemetry-api/tsconfig.json apps/telemetry-api/

# ---- Runtime Stage ----
FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/tsconfig.base.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# stdout → CloudWatch Logs via awslogs driver
CMD ["node", "--import", "tsx", "apps/telemetry-api/src/index.ts"]
