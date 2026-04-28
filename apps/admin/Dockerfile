FROM node:20-alpine
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Install dependencies (monorepo root)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/admin/package.json ./apps/admin/

RUN pnpm install --frozen-lockfile

EXPOSE 5002

ENV WATCHPACK_POLLING=true

CMD ["pnpm", "--filter", "admin", "dev"]
