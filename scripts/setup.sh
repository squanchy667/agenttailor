#!/usr/bin/env bash
set -euo pipefail

# AgentTailor — Local Setup Script
# Runs: copy env, docker compose, npm install, db push, seed, create uploads dir

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "=== AgentTailor Local Setup ==="
echo ""

# 1. Copy env file if not exists
if [ ! -f .env ]; then
  echo "→ Creating .env from .env.local.example..."
  cp .env.local.example .env
  echo "  Done."
else
  echo "→ .env already exists, skipping."
fi

# 2. Start Docker services
echo ""
echo "→ Starting Docker services (PostgreSQL, Redis, ChromaDB)..."
docker compose up -d
echo "  Waiting for services to be healthy..."
sleep 3

# 3. Install dependencies
echo ""
echo "→ Installing dependencies..."
npm install

# 4. Build shared package (required by server)
echo ""
echo "→ Building shared package..."
npm run build -w shared

# 5. Generate Prisma client
echo ""
echo "→ Generating Prisma client..."
npx prisma generate --schema=server/prisma/schema.prisma

# 6. Push database schema
echo ""
echo "→ Pushing database schema..."
npx prisma db push --schema=server/prisma/schema.prisma

# 7. Seed database
echo ""
echo "→ Seeding database..."
npx tsx server/prisma/seed.ts

# 8. Create uploads directory
echo ""
echo "→ Creating uploads directory..."
mkdir -p server/uploads

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Start development:"
echo "  npm run dev"
echo ""
echo "Server: http://localhost:4000"
echo "Dashboard: http://localhost:5173"
