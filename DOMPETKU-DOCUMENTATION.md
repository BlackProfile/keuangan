# DompetKu — Aplikasi Pengelola Pemasukan & Pengeluaran

> Aplikasi keuangan personal modern dengan fokus pada mahasiswa. Dibangun dengan Next.js 16, TypeScript, Tailwind CSS 4, Prisma, dan shadcn/ui.

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Struktur Proyek](#struktur-proyek)
4. [Fitur Utama](#fitur-utama)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Komponen Frontend](#komponen-frontend)
8. [Setup & Instalasi](#setup--instalasi)
9. [Cara Menjalankan](#cara-menjalankan)
10. [Environment Variables](#environment-variables)

---

## Overview

DompetKu adalah aplikasi pencatatan keuangan yang membantu mahasiswa mengelola uang saku, transaksi harian, budget, target tabungan, dan patungan dengan teman. Aplikasi ini memiliki UI modern dengan glassmorphism, chart interaktif, dan gamification.

**Bahasa UI:** Indonesia
**Mata Uang:** IDR (Rupiah)
**Tema Warna:** Emerald (hijau) sebagai primary, Rose (merah) untuk expense

---

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (New York style) + Lucide icons |
| Database | Prisma ORM (SQLite) |
| State Management | Zustand (client) + TanStack Query (server) |
| Animations | Framer Motion |
| Auth | NextAuth.js v4 |
| Charts | Custom SVG (Sparkline, DonutChart, MiniBarChart, ProgressRing) |

---

## Struktur Proyek

```
my-project/
├── prisma/
│   └── schema.prisma              # Database schema (31 models)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Main app page (single route)
│   │   ├── layout.tsx             # Root layout with ThemeProvider
│   │   ├── globals.css            # Global styles + CSS variables
│   │   └── api/                   # 50+ API routes
│   │       ├── transactions/
│   │       ├── dashboard/
│   │       ├── categories/
│   │       ├── accounts/
│   │       ├── budgets/
│   │       ├── goals/
│   │       ├── recurring/
│   │       ├── debts/
│   │       ├── notifications/
│   │       ├── ai/                # AI endpoints (chat, receipt, insights)
│   │       ├── shares/            # Share link system
│   │       ├── security/          # Security settings
│   │       └── ...
│   ├── components/
│   │   ├── ui/                    # shadcn/ui base components
│   │   ├── finance/               # 32 finance feature components
│   │   │   ├── dashboard-tab.tsx          # Main dashboard (redesigned)
│   │   │   ├── chart-widgets.tsx          # Sparkline, DonutChart, etc.
│   │   │   ├── transaction-list.tsx       # Transaction list
│   │   │   ├── transaction-form.tsx       # Add/edit transaction form
│   │   │   ├── budgets-section.tsx        # Budget management
│   │   │   ├── goals-section.tsx          # Savings goals
│   │   │   ├── accounts-section.tsx      # Account management
│   │   │   ├── debts-section.tsx          # Debt tracking
│   │   │   ├── recurring-section.tsx      # Recurring transactions
│   │   │   ├── ai-section.tsx             # AI chat + receipt scanner
│   │   │   ├── patungan-section.tsx       # Split bills with friends
│   │   │   ├── notifications-bell.tsx     # Real-time notifications
│   │   │   └── ...
│   │   └── layout/
│   │       └── app-shell.tsx      # Mobile shell with FAB + bottom nav
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   ├── api.ts                 # API client functions
│   │   ├── hooks.ts               # React Query hooks
│   │   ├── types.ts               # TypeScript types
│   │   ├── format.ts              # Currency/date formatters (IDR)
│   │   ├── constants.ts           # Default categories, icons, colors
│   │   ├── utils.ts               # Utility functions (cn, etc.)
│   │   └── student-constants.ts   # Student-specific constants
│   └── config/
│       └── site.ts                # Site config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Fitur Utama

### 📊 Dashboard (Redesigned)
- **Hero Card Glassmorphism**: Gradient hijau + sparkline 14-day trend + hide/show balance toggle (Eye icon, persisted localStorage) + AnimatedNumber (odometer counting)
- **Bento Grid Layout**: Sisa bulan ini + Rata-rata/hari + Tingkat tabung
- **Weekly Summary**: Mini bar chart 7 hari + auto-insight label ("Hemat 100% 🎉")
- **Top 5 Jajan**: Donut chart interaktif 5 warna + list compact
- **Budget Card**: ProgressRing circular + dual bar (aktual + proyeksi pace) + smart label
- **Target Card**: ProgressRing + gamified badge (🌱🥉🥈🥇🏆) + celebration text

### 💰 Transaksi
- Tambah/edit/hapus transaksi (income/expense/transfer)
- Kategorisasi otomatis (keyword matching)
- Tags, mood, priority, payment method
- Photo receipt upload
- Split transaction (multiple categories)
- Pin & hide transactions
- Duplicate transaction
- Voice input (Web Speech API)

### 🎯 Budget & Goals
- Budget per kategori dengan period (WEEKLY/MONTHLY/YEARLY)
- Progress tracking dengan status (safe/warning/danger/over)
- Target tabungan dengan deadline & milestone celebration
- Round-up saving (auto-save ke target)
- Streak tracking

### 👥 Patungan & Hutang
- Split bill dengan teman (patungan)
- Hutang/piutang tracking
- Settle up smart suggestions (minimum transfer)
- Quick friend debt dialog

### 🔔 Notifikasi
- Auto-generated notifications (budget alert, goal milestone, bill due, anomaly)
- Real-time bell dengan unread badge
- Mark as read / delete

### 🤖 AI Features
- AI chat assistant (LLM via z-ai-web-dev-sdk)
- Receipt OCR scanner (VLM)
- Jajan check ("Boleh jajan X?")
- Smart insights

### 🔐 Security
- App lock (PIN/password)
- Biometric authentication
- Decoy mode (fake balance)
- Trusted devices
- Audit log

### 📤 Export & Share
- CSV/Excel export
- Share link (public/private)
- QR code share
- WhatsApp share
- Template transaksi

### 📱 Mobile UX
- FAB Expansion (Material 3 speed dial): Pemasukan/Pengeluaran/Jajan
- Modern bottom nav dengan pill indicator
- Touch-friendly (44px+ targets)
- Responsive (mobile-first)

---

## Database Schema

File: `prisma/schema.prisma`

### Models (31 total)

| Model | Deskripsi |
|-------|-----------|
| Category | Kategori transaksi (Makanan, Transport, dll) |
| Account | Akun (Cash, Bank, E-wallet) |
| Transfer | Transfer antar akun |
| Transaction | Transaksi utama (income/expense) |
| TransactionSplit | Split transaksi ke multiple kategori |
| TransactionGroup | Grup transaksi |
| Installment | Cicilan |
| Debt | Hutang/piutang |
| TransactionTemplate | Template transaksi cepat |
| ReceiptItem | Item struk (untuk receipt scanner) |
| Budget | Anggaran per kategori |
| Goal | Target tabungan |
| RecurringTransaction | Transaksi berulang (langganan) |
| Tag | Tag transaksi |
| Setting | Pengaturan aplikasi |
| SecuritySetting | Pengaturan keamanan |
| AuditLog | Log aktivitas |
| TrustedDevice | Device terpercaya |
| BiometricCredential | Kredensial biometrik |
| ShareLink | Link berbagi |
| ShareView | View share link |
| ShareComment | Komentar share |
| ExportTemplate | Template export |
| StudentProfile | Profil mahasiswa |
| Challenge | Tantangan |
| ChallengeParticipation | Partisipasi tantangan |
| SplitBill | Patungan |
| SplitBillParticipant | Peserta patungan |
| FriendDebt | Hutang teman |
| Notification | Notifikasi |
| InstallmentPayment | Pembayaran cicilan |

### Setup Database

```bash
# Push schema ke SQLite
bun run db:push

# Generate Prisma Client
bun run db:generate

# Seed data (default categories + sample transactions)
curl -X POST http://localhost:3000/api/seed
```

---

## API Routes

### Core Routes

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/transactions` | List & create transactions |
| GET/PUT/DELETE | `/api/transactions/[id]` | Single transaction CRUD |
| GET | `/api/dashboard?month=YYYY-MM` | Dashboard summary |
| GET | `/api/analytics?month=YYYY-MM` | Analytics (month comparison, category breakdown) |
| GET/POST | `/api/categories` | Categories CRUD |
| GET/POST | `/api/accounts` | Accounts CRUD |
| POST | `/api/accounts/transfer` | Transfer antar akun |
| GET/POST | `/api/budgets` | Budgets CRUD |
| GET/POST | `/api/goals` | Goals CRUD |
| GET/POST | `/api/recurring` | Recurring transactions |
| POST | `/api/recurring/run` | Jalankan recurring |
| GET/POST | `/api/debts` | Debts CRUD |
| POST | `/api/debts/[id]/settle` | Settle debt |
| GET/POST | `/api/notifications` | Notifications (24h dedup) |
| POST | `/api/notifications/[id]/read` | Mark as read |

### Student Features

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/student-profile` | Profil mahasiswa |
| GET | `/api/student-profile/daily` | Daily allowance info + projection |

### AI Routes (z-ai-web-dev-sdk)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/ai/chat` | AI chat assistant |
| POST | `/api/ai/receipt` | Receipt OCR scanner |
| POST | `/api/ai/insights` | Smart insights |
| POST | `/api/ai/jajan-check` | "Boleh jajan?" check |

### Share & Export

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/shares` | Create share link |
| GET | `/api/shares/[token]` | View shared data |
| POST | `/api/shares/[token]/clone` | Clone shared transactions |
| POST | `/api/shares/[token]/revoke` | Revoke share |
| POST | `/api/import/csv` | Import CSV |

### Security

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/security` | Security settings |
| POST | `/api/security/bulk` | Bulk update security |
| GET/POST | `/api/biometric` | Biometric credentials |
| GET/POST | `/api/trusted-devices` | Trusted devices |

---

## Komponen Frontend

### Dashboard (`dashboard-tab.tsx`)
Komponen utama dengan redesigned UI:
- `HeroCard` — glassmorphism + sparkline + hide/show balance
- `BentoGrid` — sisa bulan + avg/day + savings rate
- `CounterJajanCard` — counter jajan harian
- `WeeklySummaryCard` — mini bar chart + auto-insight
- `ComparisonBulanLaluCard` — hemat/boros indicator
- `Top5JajanCard` — donut chart + list
- `BudgetMiniCard` — dual bar + projection + ProgressRing
- `GoalMiniCard` — gamified badge + ProgressRing

### Chart Widgets (`chart-widgets.tsx`)
Custom SVG chart components:
- `Sparkline` — mini line chart
- `AnimatedNumber` — odometer counting
- `MiniBarChart` — 7-day bar chart
- `DonutChart` — ring chart 5 segment
- `ProgressRing` — circular progress

### Transaction Components
- `TransactionList` — flat list dengan swipe-ready rows
- `TransactionForm` — form lengkap (amount, category, mood, priority, photo)
- `JajanButton` — voice input + quick repeat + auto-categorize

### Mobile Shell (`app-shell.tsx`)
- FAB Expansion (Material 3 speed dial)
- Modern bottom nav dengan pill indicator
- 6 tabs: Home, Catat, Saku, Target, Bagi, Lainnya

---

## Setup & Instalasi

### Prasyarat

- Node.js 18+ atau Bun 1.0+
- npm/bun package manager

### Langkah Instalasi

```bash
# 1. Extract source code
tar -xzf dompetku-source.tar.gz
cd my-project

# 2. Install dependencies
bun install
# atau
npm install

# 3. Setup database (SQLite)
bun run db:push
bun run db:generate

# 4. Jalankan dev server
bun run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

### Seed Data

Setelah aplikasi berjalan, seed default categories:

```bash
curl -X POST http://localhost:3000/api/seed
```

Ini akan membuat:
- 16 default categories (Makanan, Transportasi, Gaji, Bonus, dll)
- Sample transactions untuk testing

---

## Cara Menjalankan

### Development

```bash
bun run dev          # Start dev server (port 3000)
bun run lint         # Run ESLint
bun run db:push      # Push schema changes to DB
bun run db:generate  # Regenerate Prisma Client
```

### Production Build

```bash
bun run build        # Build for production
bun run start        # Start production server
```

---

## Environment Variables

Buat file `.env` di root project:

```env
# Database (SQLite default — file-based, no setup needed)
DATABASE_URL="file:./db/custom.db"

# NextAuth (jika menggunakan auth)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Z-AI SDK (untuk AI features — sudah pre-installed)
# Tidak perlu API key, SDK terconfig otomatis
```

**Catatan:** Untuk development, cukup `DATABASE_URL` saja. AI features menggunakan `z-ai-web-dev-sdk` yang sudah pre-configured di sandbox.

---

## Default Categories

Saat seed, 16 kategori default dibuat:

| Nama | Tipe | Icon | Warna |
|------|------|------|-------|
| Makanan | EXPENSE | UtensilsCrossed | #f97316 |
| Transportasi | EXPENSE | Car | #3b82f6 |
| Belanja | EXPENSE | ShoppingBag | #ec4899 |
| Hiburan | EXPENSE | Gamepad2 | #a855f7 |
| Tagihan | EXPENSE | ReceiptText | #ef4444 |
| Kesehatan | EXPENSE | HeartPulse | #14b8a6 |
| Pendidikan | EXPENSE | BookOpen | #6366f1 |
| Lainnya | EXPENSE | Package | #6b7280 |
| Gaji | INCOME | Wallet | #10b981 |
| Bonus | INCOME | Gift | #22c55e |
| Freelance | INCOME | Laptop | #06b6d4 |
| Investasi | INCOME | TrendingUp | #84cc16 |
| Hadiah | INCOME | Gift | #eab308 |
| Refund | INCOME | RotateCcw | #8b5cf6 |
| Penjualan | INCOME | Store | #f59e0b |
| Lainnya | INCOME | Package | #6b7280 |

---

## Format & Helper Functions

File: `src/lib/format.ts`

```typescript
formatCurrency(50000)        // "Rp 50.000"
formatCurrencyCompact(5000000) // "Rp5 jt"
formatDateLong("2026-09-20") // "20 September 2026"
relativeDay("2026-09-20")    // "Hari ini" / "Kemarin" / "20 Sep 2026"
getGreeting()                // "Selamat pagi" / "siang" / "malam"
getMonthKey(new Date())      // "2026-09"
getMonthYearLabel("2026-09") // "September 2026"
parseDateLocal("2026-09-20") // Date object (local timezone)
addDays(date, 7)              // Date + 7 days
calculateStreak(dates)        // consecutive days count
```

---

## Catatan Penting

1. **Single Route**: Aplikasi hanya menggunakan route `/` (src/app/page.tsx). Semua fitur di-render dalam single-page app dengan tab navigation.

2. **API Only**: Backend menggunakan API routes (bukan Server Actions). Semua request via `fetch()` ke `/api/*`.

3. **Mobile-First**: UI didesain mobile-first. Desktop mendapat layout grid yang lebih lebar.

4. **Dark Mode**: Didukung via `next-themes`. Toggle button di header.

5. **LocalStorage**: Beberapa preferensi disimpan di localStorage:
   - `dompetku:showBalance` — show/hide saldo
   - `dompetku:roundup-goal-id` — target round-up aktif
   - `dompetku:goal-milestones-seen` — milestone yang sudah dirayakan

---

## Lisensi

MIT License — bebas digunakan untuk keperluan personal maupun komersial.

---

**Dibuat dengan ❤️ menggunakan Next.js 16 + TypeScript + Tailwind CSS 4 + Prisma + shadcn/ui**
