#!/usr/bin/env bash
# Vercel build. Only Production builds migrate, so merging to `main` migrates
# production and previews never run migrations (ADR-0006).
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Production build: applying pending migrations."
  pnpm exec prisma migrate deploy
  pnpm exec tsx scripts/bootstrap-production.ts
else
  echo "${VERCEL_ENV:-local} build: skipping migrations."
fi

pnpm exec next build
