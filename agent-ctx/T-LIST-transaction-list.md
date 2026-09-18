# Task ID: T-LIST — transaction-list.tsx per-transaction attributes + quick actions

**Agent:** sub-agent (general-purpose, React components)
**Task:** UPDATE `TransactionList` component to display new per-transaction attributes (mood / priority / payment method / pin / flags / split / photo) and add a quick actions menu. Also extend filters with mood / priority / payment method selects and "Hanya" toggle chips.

## Reference (prior work)

- `/home/z/my-project/worklog.md` — read prior tasks (1 → 1-17, f1-f9, g1-g6, 3-A/B/C, 6-AR/AI/AC/BG, T-A, T-FORM) to understand DompetKu architecture: emerald theme, Indonesian UI, shadcn/ui (New York), sonner toast, framer-motion, Next.js 16 App Router, Prisma + SQLite, TanStack Query.
- `/home/z/my-project/src/components/finance/transaction-list.tsx` (existing ~490 LOC) — current version: filters card (search / type / category / date range / CSV), summary strip (3 cards: Pemasukan / Pengeluaran / Selisih), grouped-by-day list with framer-motion AnimatePresence, EmptyState, Skeleton rows, TransactionRow (category icon + description + meta + amount + edit Pencil).
- `/home/z/my-project/src/lib/types.ts` — `Transaction` interface includes all new per-transaction fields (mood, priority, paymentStatus, paymentMethod, photoUrl, isSplit, isDebt, isReimbursable, isSubscription, isBusinessExpense, isTaxDeductible, isPinned, account relation, tags).
- `/home/z/my-project/src/lib/constants.ts` — `MOOD_OPTIONS` (5 entries with emoji+label+color), `PRIORITY_OPTIONS` (URGENT red / NEED orange / WANT gray), `PAYMENT_METHOD_OPTIONS` (6 entries with icon name), `PAYMENT_STATUS_OPTIONS`.
- `/home/z/my-project/src/lib/hooks.ts` — `useTransactions(params)` (params = {type, categoryId, accountId, search, from, to, tag, limit}), `useCategories()`, `useDuplicateTransaction()`, `useTogglePin()`.
- `/home/z/my-project/src/lib/api.ts` — `api.exportTransactionsUrl({type, from, to})`, `api.listTransactions(params)` only forwards API-supported params (others ignored).
- `/home/z/my-project/src/lib/format.ts` — `formatCurrency`, `formatDateLong`, `relativeDay`, `parseTags`.
- `/home/z/my-project/src/app/api/transactions/route.ts` — confirmed GET only supports {type, categoryId, accountId, search, from, to, tag, limit}. New attribute filters must be done client-side.
- `/home/z/my-project/src/components/ui/dropdown-menu.tsx` — confirmed DropdownMenu primitives available.
- `/home/z/my-project/src/components/lucide-icon.tsx` — `LucideIcon name=...` for dynamic icon by name.

## Files Modified

### 1. `src/lib/hooks.ts`

- Extended `useTransactions` params type with 7 new optional client-side filter fields: `mood`, `priority`, `paymentMethod` (string), `pinned`, `reimbursable`, `debt`, `subscription` (boolean).
- The new fields participate in the queryKey (via `queryKeys.transactionsList`) so different filter combos get distinct cache entries — switching back doesn't trigger a refetch.
- `queryFn` still only forwards the existing 8 API-supported fields to `api.listTransactions`; the new fields are NOT sent to the API.
- Updated `queryKeys.transactionsList` type signature to accept `boolean` in addition to `string | number | undefined` so the new boolean params can be part of the cache key.

### 2. `src/components/finance/transaction-list.tsx` (rewritten, ~920 LOC)

Kept the overall structure: filters Card + summary strip + grouped-by-day list with AnimatePresence + EmptyState + Skeleton loading + CSV export button.

#### Summary strip (4 cards, `grid-cols-2 sm:grid-cols-4`)
- Kept: Pemasukan (green), Pengeluaran (red), Selisih (color by sign).
- **NEW 4th card "Transaksi"** — compact count of total visible transactions (after client-side filter).
- All 4 cards computed on the client-filtered list, with Skeleton placeholders during loading.

#### Filter card additions
- Kept: search input (debounced 300ms), type Select, category Select, date range Popover, CSV export button, Reset button.
- **NEW mood Select** — options from MOOD_OPTIONS (emoji + label). Default "Semua mood".
- **NEW priority Select** — options from PRIORITY_OPTIONS (colored dot + label). Default "Semua prioritas".
- **NEW paymentMethod Select** — options from PAYMENT_METHOD_OPTIONS (LucideIcon + label). Default "Semua pembayaran".
- **NEW "Hanya" toggle chips row** (`border-t pt-3` below filter buttons): 5 chips, `h-7 rounded-full text-xs`, `variant="default"` when active / `variant="outline"` when inactive, with `aria-pressed`:
  - "Lunas/Pending" → filters `paymentStatus === "PAID" || "PENDING"` (client-side)
  - "Disematkan" (Pin icon) → filters `isPinned`
  - "Reimbursable" → filters `isReimbursable`
  - "Hutang" → filters `isDebt`
  - "Langganan" → filters `isSubscription`
- `hasActiveFilters` extended to include the 8 new filter states (3 selects + 5 toggles) so Reset button appears appropriately.
- `clearFilters` resets all 13 filter states.

#### Client-side filtering (`transactions` useMemo)
- Reads `rawTransactions` from `useTransactions(params)`.
- Filters by mood / priority / paymentMethod (string equality), by `onlyLunasPending` (status PAID or PENDING), by `onlyPinned` / `onlyReimbursable` / `onlyDebt` / `onlySubscription` (boolean flags).
- Early-return optimization: if no client-side filter is active, returns the raw list directly.
- `grouped` useMemo + totalIncome / totalExpense / totalBalance computed on the filtered list.

#### Day group header
- Kept: day label (relativeDay) + day income (green) + day expense (red) + count Badge.
- **NEW**: if any transaction in the day is `isPinned`, render a filled `Pin` icon (`fill-primary text-primary`, `h-3 w-3`) next to the day label.

#### TransactionRow enhancements
- Kept: category icon (40×40 color-tinted), description, category name + date meta row, color-coded amount (text-income/text-expense with +/− prefix), edit Pencil button (ghost, opacity-0 → group-hover:opacity-100).
- **NEW mood emoji** — small `text-xs` emoji after description (only if `mood` set, looked up from MOOD_OPTIONS).
- **NEW priority badge** — small `h-1.5 w-1.5 rounded-full` colored dot (URGENT #ef4444, NEED #f97316, WANT #6b7280), only if `priority` set.
- **NEW payment method icon** — small `h-3 w-3` LucideIcon (dynamic name from PAYMENT_METHOD_OPTIONS), `text-muted-foreground`, only if `paymentMethod` set.
- **NEW pinned indicator** — `Pin` icon (`fill-primary text-primary`, `h-3 w-3`) shown next to description when `isPinned`. (Pinned-first ordering is already handled by API `orderBy: [{ isPinned: "desc" }, { date: "desc" }, { createdAt: "desc" }]`.)
- **NEW meta row account chip** — when `transaction.account` is set, shows `· [icon] account.name` after the date (account icon + name with the account's color).
- **NEW flags row** (conditionally rendered when at least one flag/tag/photo is present):
  - "Hutang" (red tint) — if `isDebt`
  - "Reimbursable" (cyan tint) — if `isReimbursable`
  - "Langganan" (purple tint) — if `isSubscription`
  - "Bisnis" (orange tint) — if `isBusinessExpense`
  - "Pajak" (gray tint) — if `isTaxDeductible`
  - "Split" (teal tint) — if `isSplit`
  - Tags from `parseTags(transaction.tags)` as `#tag` muted chips
  - Camera icon chip — if `photoUrl` set
- **NEW quick actions menu** (DropdownMenu via MoreVertical trigger, always visible h-8 w-8 ghost):
  - "Duplikat" (Copy icon) → `useDuplicateTransaction().mutate(id)` with toast.success / toast.error; Loader2 spinner while pending; disabled while pending.
  - "Sematkan" / "Lepas Sematan" (Pin icon, label depends on `isPinned`) → `useTogglePin().mutate(id)` with toast feedback; Loader2 while pending.
  - Separator.
  - "Lihat Detail" (Eye icon) → no-op placeholder, calls `toast("Detail transaksi")`. Will be wired to a real detail view later.

## Conventions followed
- `"use client"` directive.
- shadcn/ui only: Button, Input, Badge, Select, Popover, Card, Skeleton, DropdownMenu.
- `LucideIcon` from `@/components/lucide-icon` for dynamic icons (account/category/payment-method icons from DB / constants).
- Direct `lucide-react` imports only for static UI icons: Camera, Copy, Download, Eye, Inbox, Loader2, MoreVertical, Pencil, Pin, Search, SlidersHorizontal, X.
- `cn()` from `@/lib/utils`.
- Indonesian throughout (labels, placeholders, toasts, menu items, badges).
- Emerald theme preserved (text-income / text-expense, primary tints for active states, fill-primary for pin icon).
- `toast` from `sonner`.
- `formatCurrency` / `formatDateLong` / `relativeDay` / `parseTags` from `@/lib/format`.
- Mobile-first responsive: filter chips wrap to multiple rows on small screens, summary cards collapse to 2-col, touch targets ≥ 28px (h-7 chips).

## Validation & Quality

- `bun run lint` → **0 errors, 0 warnings**.
- `bunx tsc --noEmit` → **0 errors in `transaction-list.tsx` and `hooks.ts`**.
  - Initial run flagged 2 TS2322 errors at lines 768 and 774: `<LucideIcon title={...}>` and `<Pin title="..." />`. In this `lucide-react` version, `LucideProps` extends `SVGAttributes` which doesn't include `title` as an attribute. Fixed by:
    - Replacing `title={...}` with `aria-label={...}` on the LucideIcon (payment-method indicator).
    - Removing the redundant `title="Disematkan"` on the Pin icon (the `aria-label="Disematkan"` was already set).
  - Pre-existing TS errors in unrelated files (e.g. dashboard/route.ts, analytics/route.ts, examples/) are unchanged and out of scope.
- Dev server log: clean compilation (`✓ Compiled in Nms`), no errors related to transaction-list.tsx or hooks.ts.

## Backward Compatibility

- Same exported name `TransactionList` and same `Props` interface signature — `src/app/page.tsx` and any consumer rendering `<TransactionList onEdit limit showFilters />` continues to work unchanged.
- `useTransactions` params type extension is purely additive (7 new optional fields), so existing callers in other components (accounts-section, calendar-section, analytics-section, dashboard-tab) are unaffected.

## Status

✅ Completed. Lint-clean, type-clean, dev-server-clean.
