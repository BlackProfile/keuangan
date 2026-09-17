# Task ID: 6-AR — Accounts & Recurring Section Components

## Agent
general-purpose sub-agent (React/Next.js component builder)

## Task
Build two production-quality React components for "DompetKu" finance app:
1. `src/components/finance/accounts-section.tsx` — full account management view (summary hero, account grid, transfer dialog, add/edit dialog, delete confirmation, expandable recent transactions per account)
2. `src/components/finance/recurring-section.tsx` — recurring transactions view (info banner, list with active toggle, run-now action, add/edit dialog with frequency/interval/category/account, delete confirmation)

## Context Reviewed
- `/home/z/my-project/worklog.md` — understood prior work (Tasks 1, 2-9, f1-f9, g1-g6, 3-A, 3-B, 3-C)
- `src/components/finance/category-manager.tsx` — dialog + AlertDialog + icon/color picker patterns
- `src/components/finance/summary-cards.tsx` — gradient card styling (gradient-balance/income/expense, ring-inner-glow)
- `src/components/finance/transaction-list.tsx` — list patterns, Skeleton loading, EmptyState, framer-motion AnimatePresence
- `src/components/finance/transaction-form.tsx` — type toggle, Rp prefix input, form validation
- `src/lib/hooks.ts` — useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useTransfer, useRecurring, useCreateRecurring, useUpdateRecurring, useDeleteRecurring, useRunRecurring, useCategories, useTransactions
- `src/lib/types.ts` — Account, AccountInput, AccountType, TransferInput, RecurringTransaction, RecurringInput, Frequency, TransactionType
- `src/lib/constants.ts` — ACCOUNT_TYPE_ICONS, ACCOUNT_COLORS, ACCOUNT_TYPE_LABELS mapping
- `src/lib/format.ts` — formatCurrency, formatCurrencyCompact, formatDate, formatDateInput, formatDateLong, relativeDay
- `src/lib/api.ts` — confirmed hook return shapes (runRecurring returns {generated: number})
- `src/app/globals.css` — gradient classes (.gradient-balance, .gradient-hero, .ring-inner-glow), color utilities (.bg-income, .text-income, .text-expense)

## Files Created

### 1. `src/components/finance/accounts-section.tsx` (~1085 lines)
Exports `AccountsSection` — full account management view.

**Structure:**
- `AccountsSection` (main) — header with "Akun" title + Transfer button + Tambah Akun button; total balance hero card (gradient-balance with white text, ring-inner-glow, decorative radial blurs); account grid (1 col mobile / 2 sm / 3 lg); empty state with CTA
- `AccountCard` — clickable card expanding to show recent transactions; shows category icon (color-tinted bg), name, "Utama" badge if isDefault, type label (Tunai/Bank/E-Wallet/Investasi), balance; hover reveals edit (Pencil) + delete (Trash2 in AlertDialog); chevron rotates when expanded
- `AccountRecentTransactions` — uses `useTransactions({accountId, limit:5})`; renders list of last 5 transactions with category icon, description, relativeDay, signed amount (formatCurrencyCompact); loading skeleton + empty fallback
- `AccountFormDialog` (add/edit) — name Input, type Select (CASH/BANK/EWALLET/INVESTMENT with icons), icon picker (4 icons from ACCOUNT_TYPE_ICONS[type], grid-cols-4), color picker (ACCOUNT_COLORS with Check indicator), balance Input with Rp prefix (label "Saldo Awal" / "Saldo Saat Ini" depending on isEdit + helper note), isDefault Switch in bordered box, note Textarea; preview icon in header shows live color/icon; validation + error display
- `TransferDialog` — from/to account Selects (each disabled when matches the other, shows balance + compact balance), amount Input with Rp prefix, date Input (default today, max today), fee Input (optional, helper note "akan tercatat sebagai pengeluaran"), note Textarea; sameAccount guard; uses `useTransfer` mutation

**Key behaviors:**
- Delete with AlertDialog confirmation; API returns 409 if account has transactions → toast error shows message; isDefault accounts show warning in dialog description
- Transfer button disabled when < 2 accounts (both in header and hero)
- Toast feedback on all CRUD operations (Indonesian)
- framer-motion AnimatePresence for expand/collapse animation
- Mobile-first responsive: header buttons collapse text on mobile, grid stacks

### 2. `src/components/recurring-section.tsx` (~887 lines)
Exports `RecurringSection` — recurring transactions view.

**Structure:**
- `RecurringSection` (main) — header with "Transaksi Berulang" + Jalankan Sekarang button (useRunRecurring, shows Play icon, disabled when 0 active) + Tambah button; info banner (primary/5 bg, Info icon, explains auto-generation); list with AnimatePresence
- `RecurringItem` — Card with category icon (color-tinted), description, type badge (INCOME green / EXPENSE red, bg-income/10 or bg-expense/10), frequency label (getFrequencyLabel), next date (formatDate), account chip if set, note (italic truncated); right side: signed amount (income green / expense red) + active Switch (useUpdateRecurring to toggle active field); opacity-70 when inactive; hover reveals edit + delete
- `EmptyState` — Repeat icon, message, CTA button
- `RecurringFormDialog` (add/edit) — type toggle (Pemasukan/Pengeluarang with bg-income/bg-expense), amount Input with Rp prefix, description Input, category Select (filtered by type, auto-picks first), account Select (optional, "NONE" = tanpa akun), frequency Select (DAILY/WEEKLY/MONTHLY/YEARLY) + interval Input (grid-cols-2), live frequency label preview below, startDate Input, endDate Input (optional, min=startDate, helper note "kosongkan agar tanpa batas"), note Textarea

**Key helper:**
```typescript
function getFrequencyLabel(frequency: Frequency, interval: number): string {
  const unit = FREQUENCY_UNIT[frequency]; // hari/minggu/bulan/tahun
  if (interval <= 1) return `Setiap ${unit}`;
  return `Setiap ${interval} ${unit}`;
}
```
Examples: MONTHLY interval=1 → "Setiap bulan"; MONTHLY interval=2 → "Setiap 2 bulan"; WEEKLY interval=3 → "Setiap 3 minggu"

**Key behaviors:**
- "Jalankan Sekarang" calls useRunRecurring; toast.success shows count "N transaksi berulang berhasil dibuat." when generated>0; toast.info "Tidak ada transaksi berulang yang perlu dijalankan saat ini." when generated=0
- Active Switch calls useUpdateRecurring with `{active: checked}` (cast to Partial<RecurringInput>); toast on success/error
- Category auto-selects first matching type on load/type-change
- Validation: amount>0, description non-empty, category required, interval positive int, startDate required, endDate >= startDate
- Submit button color matches type (bg-income for INCOME, bg-expense for EXPENSE)

## Conventions Followed
- "use client" directive
- shadcn/ui: Button, Card, Dialog, DialogClose, AlertDialog, Input, Label, Textarea, Switch, Badge, Skeleton, Select
- LucideIcon from "@/components/lucide-icon" for dynamic icons (account/category icons from DB)
- Direct lucide-react imports only for static UI icons (Plus, Pencil, Trash2, X, Loader2, ChevronDown, ArrowLeftRight, Wallet, Inbox, Check, Info, CalendarClock, Repeat, Play)
- cn() from "@/lib/utils" for conditional classes
- Indonesian language throughout (labels, placeholders, toasts, helper text)
- Emerald theme: bg-income/bg-expense/badge income/expense tints, gradient-balance hero, ring-inner-glow
- formatCurrency (full) for balances/amounts, formatCurrencyCompact for compact display in selects/recent tx
- toast from "sonner" for all feedback
- Mobile-first: responsive grids, button text collapses on mobile
- AlertDialog for delete confirmation (matches category-manager pattern)
- Dialog with showCloseButton={false} + manual DialogClose X button (matches transaction-form pattern to avoid duplicate close)
- max-h-[65vh]/[70vh] + custom-scrollbar for scrollable form bodies
- Loading: Skeleton placeholders matching layout shape
- Empty state: dashed border + icon + CTA
- framer-motion: AnimatePresence + motion.div for list items and expand/collapse

## Lint & Type Check
- `bun run lint` on both files: **0 errors, 0 warnings**
  * Initial run flagged 2 "Unused eslint-disable directive" warnings in accounts-section.tsx (TransferDialog useEffect deps)
  * Fixed by removing the unnecessary `// eslint-disable-next-line react-hooks/exhaustive-deps` comments (the rule wasn't actually triggering)
  * For AccountFormDialog type-change effect, added `isEdit` and `icon` to deps array (no infinite loop because condition becomes false after first set)
- `bunx tsc --noEmit` on both files: **0 errors** (pre-existing TS errors in other files like dashboard/route.ts, examples/, skills/ are untouched and out of scope)
- Dev server compiles cleanly (multiple "✓ Compiled" entries in dev.log, no errors related to my files)

## Integration Notes (for orchestrator)
These components are **not yet wired into `src/app/page.tsx`**. The page currently has 3 tabs (dashboard, transactions, categories). To surface these new sections, the orchestrator should add new tabs (e.g. "Akun", "Berulang") and render `<AccountsSection />` / `<RecurringSection />`. The components are self-contained and ready to drop in — they fetch their own data via hooks and manage their own dialog state.

## Status
✅ Both files complete, lint-clean, type-clean, production-ready.
