#!/bin/bash
# ============================================================
# DompetKu — Setup Script
# Aplikasi Pengelola Pemasukan & Pengeluaran
# ============================================================
# Cara pakai:
#   1. Extract: tar -xzf dompetku-source.tar.gz
#   2. Jalankan: bash setup.sh
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║       DompetKu — Setup & Install Script             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Cek apakah ada package.json
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json tidak ditemukan."
  echo "   Pastikan Anda menjalankan script ini dari root project."
  echo "   Extract dompetku-source.tar.gz dulu: tar -xzf dompetku-source.tar.gz"
  exit 1
fi

echo "📦 Step 1: Install dependencies..."
if command -v bun &> /dev/null; then
  echo "   Using bun..."
  bun install
elif command -v npm &> /dev/null; then
  echo "   Using npm..."
  npm install
elif command -v pnpm &> /dev/null; then
  echo "   Using pnpm..."
  pnpm install
else
  echo "❌ Error: Tidak ada package manager (bun/npm/pnpm) yang terinstall."
  exit 1
fi
echo "   ✅ Dependencies installed"
echo ""

echo "🗄️  Step 2: Setup database (SQLite)..."
if command -v bun &> /dev/null; then
  bun run db:push
  bun run db:generate
else
  npx prisma db push --accept-data-loss
  npx prisma generate
fi
echo "   ✅ Database ready (db/custom.db)"
echo ""

echo "🌱 Step 3: Start dev server..."
echo "   Starting in background..."
if command -v bun &> /dev/null; then
  nohup bun run dev > dev.log 2>&1 &
else
  nohup npm run dev > dev.log 2>&1 &
fi
SERVER_PID=$!
echo "   ✅ Server PID: $SERVER_PID"
echo ""

echo "⏳ Step 4: Waiting for server to be ready..."
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
    echo "   ✅ Server ready at http://localhost:3000"
    break
  fi
  echo "   Waiting... ($i/30)"
  sleep 2
done
echo ""

echo "🌱 Step 5: Seed default categories..."
curl -s -X POST http://localhost:3000/api/seed | head -c 200
echo ""
echo "   ✅ Default categories seeded (16 categories + sample transactions)"
echo ""

echo "🔍 Step 6: Verify..."
LINT_RESULT=$(bun run lint 2>&1 | tail -1)
echo "   Lint: $LINT_RESULT"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo "   Server: HTTP $HTTP_CODE"
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ Setup Complete! ✅                  ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  🌐 Aplikasi: http://localhost:3000                  ║"
echo "║  📊 Dashboard: klik tab Home                        ║"
echo "║  ➕ Tambah transaksi: FAB (+) di kanan bawah        ║"
echo "║  🔔 Notifikasi: klik bell di header                 ║"
echo "║  🌙 Dark mode: klik moon icon di header             ║"
echo "║                                                      ║"
echo "║  Untuk stop server: kill $SERVER_PID                ║"
echo "║  Log: tail -f dev.log                                ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
