# Task ID: 6-AI — AI Section & Settings Section Components

**Agent:** sub-agent (general-purpose, React components)
**Date:** September 2026
**Scope:** Frontend React components for AI assistant view + Settings view

---

## Work Log

### Context review
- Read `/home/z/my-project/worklog.md` to understand prior work (Tasks 1–g6, 3-A, 3-B, 3-C)
- Read reference components:
  - `src/components/finance/category-manager.tsx` (dialog patterns, AlertDialog confirmation, LucideIcon usage, shadcn/ui Card/Skeleton/Switch/Button patterns)
  - `src/components/finance/dashboard-tab.tsx` (card patterns, gradient, motion animations, Skeleton loading)
  - `src/components/finance/transaction-list.tsx` (useCategories usage, custom-scrollbar, badge counts, framer-motion AnimatePresence)
- Read infrastructure:
  - `src/lib/hooks.ts` — confirmed `useAiChat`, `useReceiptScan`, `useInsights`, `useSettings`, `useUpdateSetting`, `useImportCsv`, `useSeed` exist with expected signatures
  - `src/lib/types.ts` — confirmed `ChatMessage`, `AppSettings` types; `AppSettings` uses `theme: "light" | "dark" | "system"` field
  - `src/lib/format.ts` — confirmed `hashPin` (async SHA-256 via SubtleCrypto), `formatCurrency`, `formatDate`
  - `src/lib/api.ts` — confirmed `exportTransactionsUrl(params)`, `backupUrl()`, `receiptScan` returns `{merchant?, date?, total?, items?, category?}` (API also returns `error` field on fallback)
  - `src/components/ui/input-otp.tsx` — verified `InputOTP`, `InputOTPGroup`, `InputOTPSlot` exports available
  - `src/components/theme-toggle.tsx` — verified `useTheme()` from `next-themes` pattern with `mounted` guard for hydration safety
  - `src/app/page.tsx` — current tab system uses `Tabs` with 3 tabs (dashboard/transactions/categories); new components are ready for tab integration but page.tsx was NOT modified per task scope

### File 1: `src/components/finance/ai-section.tsx`

**Structure:** `AiSection` main component with internal `Tabs` (3 sections) — exports only `AiSection`

**Props:** `onCreateTransaction?: (data) => void`, `onNavigateToAdd?: () => void`

**A. Chat Asisten (`ChatAsisten` internal component)**
- Local state `messages: ChatMessage[]` initialized with welcome assistant message
- Card with `flex h-[32rem] flex-col` layout: header / scrollable messages / suggestions / input
- `useAiChat` mutation: on send, append user message to local state, call `mutateAsync(nextMessages)` with full history, then append reply on success or fallback assistant message on error
- MessageBubble: user = right-aligned, `bg-primary text-primary-foreground` rounded bubble; assistant = left-aligned `bg-muted` bubble with Bot avatar
- TypingIndicator: three bouncing dots with staggered `animation-delay` (0/150/300ms) + Bot avatar
- Suggested question chips (`messages.length <= 1`): "Berapa total pengeluaranku bulan ini?", "Kategori apa yang paling boros?", "Tips hemat bulan ini" — clicking sends immediately
- Auto-scroll: `useEffect` on `[messages, chatMut.isPending]` sets `scrollTop = scrollHeight` on ref
- Enter key (without Shift) sends; disabled while pending; input has `aria-label="Pesan ke asisten"`
- Send button shows `Loader2` spinner while pending

**B. Pindai Struk (`PindaiStruk` internal component)**
- Drag-and-drop upload area (also click-to-select via hidden `<input type="file" accept="image/*">`)
- `handleFile`: validates `image/*` MIME, `FileReader.readAsDataURL` → sets preview as data URL, clears prior result
- Image preview with overlay remove button (X) — uses native `<img>` (no eslint-disable needed since `@next/next/no-img-element` rule not enabled in this config)
- "Pindai" button → `scanMut.mutate(preview, ...)` sends data URL to `/api/ai/receipt`
- Loading skeleton while scanning (when `scanMut.isPending && !result`)
- `ReceiptResultCard` displays: merchant, date (formatted), category, total (formatted IDR with `text-primary` highlight), items list (scrollable `max-h-44`)
- Handles `error` field on result (casts `data as ReceiptResult` since api type doesn't include `error`): shows amber warning badge + toast.warning
- "Buat Transaksi" button (only when `onCreateTransaction` provided): finds EXPENSE category by name (case-insensitive), falls back to first EXPENSE category, then calls `onCreateTransaction({type:'EXPENSE', amount:total, description:merchant||'Struk', date, categoryId, merchant})`
- Toast feedback on scan + create; resets state after creating transaction

**C. Insight Otomatis (`InsightOtomatis` internal component)**
- `useInsights()` query (staleTime 5min)
- Card header with Sparkles icon + Refresh button (`refetch()`, spins `RefreshCw` while fetching)
- Loading: 4 Skeleton cards
- Empty state: dashed border card + Sparkles icon + `onNavigateToAdd` button (when provided) to add transaction
- Insight items: each rendered in a rounded card with Sparkles icon (28×28 primary tinted), staggered `motion.div` fade-in (`delay: i * 0.05`) using `AnimatePresence mode="popLayout"`

### File 2: `src/components/finance/settings-section.tsx`

**Structure:** `SettingsSection` main component + 5 sub-section components

**Shared helpers:**
- `parseSettings(raw)`: converts flat `Record<string,string>` from API → typed `AppSettings` (defaults: pinEnabled=false, hideAmounts=false, reminderHour=20, theme=system)
- `SectionCard`: card with icon badge + title + description + `divide-y` children container
- `SettingRow`: row layout (icon badge + title/description on left, control on right) with `first:pt-0 last:pb-0` to avoid outer padding

**A. Keamanan (`KeamananSection`)**
- "Kunci PIN" Switch: when enabling opens PIN Dialog with `InputOTP maxLength={4}` (4 separate slots), hash via `hashPin(pin)` (async SubtleCrypto SHA-256) → save `{key:'pinHash', value:hash}` + `{key:'pinEnabled', value:'true'}` via two `useUpdateSetting` calls; toast success
- When disabling: clears `pinHash` (empty string) + sets `pinEnabled='false'`; toast success
- PIN Dialog: `max-w-sm`, autoFocus OTP, hint "Ingat PIN ini — tidak bisa dipulihkan"
- "Sembunyikan Nominal" Switch: saves `{key:'hideAmounts', value:'true'/'false'}`; toast feedback

**B. Tampilan (`TampilanSection`)**
- 3-button segmented theme toggle (Terang/Gelap/Sistem) using `next-themes useTheme()` directly (not via settings, per task spec)
- `mounted` guard prevents hydration mismatch (same pattern as existing `theme-toggle.tsx`)
- Active button: `bg-background text-foreground shadow-sm`; inactive: `text-muted-foreground hover:text-foreground`
- Labels hidden on mobile (`hidden sm:inline`), icons always visible

**C. Pengingat (`PengingatSection`)**
- "Pengingat Catat Harian" Switch: when enabling, requests `Notification.requestPermission()` first (if browser supports), then saves `{key:'reminderEnabled'}`
- Hour input (`type="number" min=0 max=23`): saves `{key:'reminderHour', value:String(num)}` only when valid integer 0-23
- `useEffect` schedules `setInterval` (60s tick) that fires a `Notification` once per day at the target hour (guards against duplicate via `localStorage` key `dompetku-reminder-{dateString}`), only fires in first 5 minutes of hour, only when `Notification.permission === 'granted'`. Cleanup clears interval on unmount/disable
- "Uji Notifikasi" button (only when reminder enabled): tests `new Notification(...)` with granted permission, or toasts warning if not granted

**D. Data (`DataSection`)**
- "Impor CSV" button → opens Dialog (`max-w-2xl`) with hidden file input (`accept=".csv"`)
- Client-side CSV parser (`parseCsv`): strips UTF-8 BOM, splits lines, handles quoted fields with embedded commas + escaped `""` quotes, first row = headers, returns `{headers, rows}`
- Preview `Table` (shadcn/ui Table) showing first 50 rows with header note if truncated
- "Impor" button → `importMut.mutate(csvRows)`; on success toast "X transaksi diimpor, Y dilewati"; on error toast
- "Ekspor CSV" button → `window.location.href = api.exportTransactionsUrl()` + toast
- "Backup JSON" button → `window.location.href = api.backupUrl()` + toast
- "Muat Data Contoh" button → AlertDialog confirmation → `seedMut.mutate(undefined, ...)`; toast success/error
- Delete-all intentionally skipped per task spec ("skip delete-all to avoid complexity")
- Dialog uses custom header layout (similar to CategoryFormDialog) with X close button, sticky footer with Batal/Impor buttons

**E. Tentang (`TentangSection`)**
- App version badge (v1.0.0)
- Tech stack info: "Next.js 16, TypeScript, Prisma, Tailwind CSS, shadcn/ui"
- Storage note: "Semua data tersimpan lokal di perangkat Anda menggunakan SQLite"
- Three badges: v1.0.0 / Modern Stack (Sparkles) / Lokal (ShieldCheck)

### Lint & Type Check
- `bun run lint` → **0 errors, 0 warnings** (initial run had 1 unused eslint-disable warning for `@next/next/no-img-element` on `<img>` tag; removed the directive since the rule is not enabled in this project's eslint config)
- `bunx tsc --noEmit` → **0 errors in `ai-section.tsx` and `settings-section.tsx`** (pre-existing TS errors in `dashboard/route.ts`, `analytics/route.ts`, `budgets/status/route.ts`, `examples/`, `skills/` are unchanged and out of scope per Task 3-C worklog)

### Dev Server Verification
- Dev server log shows successful compilation after each edit (`✓ Compiled in 215ms` etc.)
- No errors related to `ai-section.tsx` or `settings-section.tsx` in dev.log
- Pre-existing AI route errors (code 1210 image format, code 1214 messages param) are handled gracefully by backend (returns 200 with fallback shape per Task 3-C worklog); frontend components will display fallback results correctly

### Design conventions followed
- `"use client"` directive on both files
- Indonesian UI text throughout
- Emerald theme: `bg-primary/10 text-primary` for icon badges, `text-primary` for highlights
- shadcn/ui components only (Button, Card, Switch, Input, Skeleton, Badge, Dialog, AlertDialog, InputOTP, Table, Tabs)
- LucideIcon imports from `lucide-react`
- `cn()` from `@/lib/utils` for conditional class merging
- `toast` from `sonner` for user feedback
- `formatCurrency` and `formatDate` from `@/lib/format`
- `custom-scrollbar` class for scrollable lists (matches existing globals.css definition)
- Framer Motion `motion.div` + `AnimatePresence` for subtle entrance animations (matches dashboard-tab.tsx pattern)
- Loading states: Skeleton placeholders while data fetches
- Empty states: dashed border cards with icon + helpful copy + CTA
- Mobile responsive: labels hidden on small screens (`hidden sm:inline`), grid collapses to single column, touch targets ≥ 36px
- Accessibility: aria-labels on all interactive icon-only buttons, `aria-pressed` on theme toggle, semantic structure

---

## Stage Summary

- **2 production-quality React components created** (`ai-section.tsx` ~590 LOC, `settings-section.tsx` ~620 LOC)
- **AI Section** delivers 3 features in tabs:
  - Chat Asisten: full chat UI with message history, typing indicator, suggested questions, auto-scroll, Enter-to-send, error fallbacks
  - Pindai Struk: drag-drop image upload, base64 conversion, scan via vision API, structured result display with items list, one-click "Buat Transaksi" with category auto-matching
  - Insight Otomatis: refetchable insight list with Sparkles icons, staggered animations, empty state CTA
- **Settings Section** delivers 5 organized sections (Keamanan/Tampilan/Pengingat/Data/Tentang) with:
  - PIN lock via InputOTP + async SHA-256 hashPin + dual setting writes
  - Hide amounts toggle
  - 3-button next-themes theme toggle (hydration-safe)
  - Daily reminder with browser Notifications API + localStorage dedup + test button
  - CSV import with quoted-field-aware parser + preview table
  - CSV/JSON export via `window.location.href`
  - Seed with AlertDialog confirmation
  - App info badges
- **Lint clean (0/0), TypeScript clean for new files**
- **Ready for integration into `page.tsx`** (just add `<AiSection />` and `<SettingsSection />` to a new tab — out of scope per task definition)
