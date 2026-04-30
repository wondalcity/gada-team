FROM node:20-alpine
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Install dependencies (monorepo root)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

EXPOSE 4000

ENV WATCHPACK_POLLING=true

CMD ["pnpm", "--filter", "web", "dev"]
