#!/bin/bash
# Script para preparar o schema do Prisma baseado no ambiente
# Uso: ./scripts/prepare-schema.sh [sqlite|postgresql]

ENV_TYPE="${1:-${NODE_ENV:-development}}"
PRISMA_DIR="prisma"
TARGET_SCHEMA="${PRISMA_DIR}/schema.prisma"

case "$ENV_TYPE" in
  production|prod|postgresql)
    SOURCE="${PRISMA_DIR}/schema.postgresql.prisma"
    echo "🐘 Modo PostgreSQL (production)"
    ;;
  development|dev|sqlite|local)
    SOURCE="${PRISMA_DIR}/schema.sqlite.prisma"
    echo "📦 Modo SQLite (development)"
    ;;
  *)
    echo "⚠️ Ambiente desconhecido: $ENV_TYPE"
    echo "Uso: $0 [sqlite|postgresql]"
    exit 1
    ;;
esac

if [ ! -f "$SOURCE" ]; then
  echo "❌ Schema fonte não encontrado: $SOURCE"
  exit 1
fi

cp "$SOURCE" "$TARGET_SCHEMA"
echo "✅ Schema atualizado: $SOURCE → $TARGET_SCHEMA"
