# ============================================================
# Build stage
# ============================================================
FROM node:22-alpine AS builder

# Ativa corepack para gerenciar npm/yarn/pnpm/bun
RUN corepack enable && corepack prepare npm@latest --activate

WORKDIR /app

# Copia lockfiles e instala dependências primeiro (cache layer)
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Instala Bun e dependências com lock exato
RUN npm install -g bun && bun install --frozen-lockfile

# Copia o restante do projeto — INCLUINDO o .env principal
COPY . .

# Garante que o Prisma Client seja gerado antes do build
RUN bunx prisma generate

# Desativa telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build da aplicação Next.js (standalone)
RUN bun run build

# ============================================================
# Production stage (runtime mínimo)
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia arquivos essenciais do build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static/ ./.next/static/
COPY --from=builder --chown=nextjs:nodejs /app/prisma/ ./prisma/
COPY --from=builder --chown=nextjs:nodejs /app/public/ ./public/

# Instala Prisma CLI e tsx globalmente no runner para comandos de db/seed
RUN npm install -g prisma@6.3.0 tsx@4.19.2

# Copia dependências necessárias para o seed funcionar no runner
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# NOTA: Não copiamos .env para a imagem.
# As variáveis de ambiente devem ser passadas no runtime
# (docker run -e, docker-compose environment, Komodo, Umbrel, etc.)

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
