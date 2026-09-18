# Task ID T-DT — debts-section.tsx & templates-section.tsx

**Agent**: sub-agent (general-purpose)
**Task**: Build debts-section.tsx & templates-section.tsx React components for DompetKu (Next.js 16 finance app)

## Summary

Created 2 production-quality React components (~1845 LOC total) following the existing codebase patterns (emerald theme, Indonesian UI, shadcn/ui, sonner toast, TanStack Query, "use client").

## Files Created

### 1. `/home/z/my-project/src/components/finance/debts-section.tsx` (~925 LOC)
Exports: `DebtsSection`

Features:
- Header "Hutang & Piutang" + "Tambah" button
- 3 gradient summary cards:
  - Total Hutang (rose→red gradient, ArrowUpRight icon)
  - Total Piutang (emerald→green gradient, ArrowDownLeft icon)
  - Saldo Bersih (teal→emerald when surplus, orange→rose when deficit, Scale icon)
  - Each shows remaining amount, total reference, decorative blob
- Tabs: "Hutang Saya" / "Piutang Saya" with icon prefixes
- DebtCard:
  - Users icon (color-coded by type)
  - Person name + type badge (rose/emerald)
  - "Lunas" badge when settled (emerald, CheckCircle2)
  - "Terlambat" badge when overdue (red, AlertTriangle) — uses `parseDateLocal(dueDate) < today`
  - 2-col grid: Total + Sisa (color-coded)
  - Progress bar (h-2, fill color = type color)
  - "Dibayar X · Y% lunas" footer
  - Description line-clamp-2
  - "Tandai Lunas" button (calls `useSettleDebt`)
  - Hover edit/delete actions (group-hover opacity)
- DebtFormDialog:
  - Type selector (2-button grid, color fills when active)
  - Person (label "Kepada Siapa"/"Dari Siapa" based on type)
  - Amount + paidAmount grid (live "Sisa X" preview)
  - Due date (Popover + Calendar + formatDateLong + "Hapus tanggal")
  - Description Textarea + Note Input
  - Type preview info box
  - Submit validation: person, amount>0, paid>=0, paid<=amount
  - `useCreateDebt` for create, `useUpdateDebt` for edit
- Empty state per section + Loading skeletons (3x per tab)

### 2. `/home/z/my-project/src/components/finance/templates-section.tsx` (~920 LOC)
Exports: `TemplatesSection`

Features:
- Header "Template Transaksi" + "Tambah Template" button
- Info banner (emerald-tinted Card, explains what templates are)
- Grid of template cards (sm:grid-cols-2 lg:grid-cols-3):
  - Icon (emerald for INCOME, rose for EXPENSE) + name + type badge + priority badge
  - Big amount color-coded tabular-nums
  - Description line-clamp-2
  - Meta rows: Kategori, Akun, Merchant (Store icon), Metode (with LucideIcon)
  - "Gunakan" button (calls `useCreateTransaction` with template fields + today's date)
  - Hover edit/delete
- TemplateFormDialog:
  - Type toggle (INCOME bg-income / EXPENSE bg-expense, resets category on switch)
  - Name Input (max 50)
  - Icon picker grid (22 TEMPLATE_ICONS, max-h-40 custom-scrollbar)
  - Amount Input (with formatCurrency preview)
  - Description Textarea
  - Category Select (filtered by type, LucideIcon + category.color)
  - Account Select (optional, includes "Tidak ada akun" option)
  - Merchant Input
  - Payment method + Priority Selects (grid-cols-2 on sm+)
  - Preview card
  - Submit validation: name, amount>=0, description, category
- Edit implemented as **delete + recreate** (no `useUpdateTemplate` / PUT endpoint exists; spec said use existing hooks `useCreateTemplate` + `useDeleteTemplate`)
- "Gunakan" action toast: `Transaksi ditambahkan dari template "${name}".`
- Empty state + Loading skeletons (6x)

## Patterns Reused

- shadcn/ui components: Card, Button, Badge, Dialog, AlertDialog, Input, Label, Textarea, Select, Popover, Calendar, Skeleton, Tabs
- `LucideIcon` from "@/components/lucide-icon" for dynamic icons (category/account/template icons by string name)
- `cn()` from "@/lib/utils"
- `toast` from "sonner"
- `formatCurrency`, `formatCurrencyCompact`, `formatDateInput`, `formatDateLong`, `parseDateLocal` from "@/lib/format"
- `DEBT_TYPE_OPTIONS`, `TEMPLATE_ICONS`, `PRIORITY_OPTIONS`, `PAYMENT_METHOD_OPTIONS` from "@/lib/constants"
- Hooks: `useDebts`, `useCreateDebt`, `useUpdateDebt`, `useDeleteDebt`, `useSettleDebt`, `useTemplates`, `useCreateTemplate`, `useDeleteTemplate`, `useCreateTransaction`, `useCategories`, `useAccounts`
- Dialog pattern from budgets-section.tsx: `showCloseButton={false}` + sticky header (border-b bg-muted/30 p-5) + scrollable body (max-h-[65vh] overflow-y-auto custom-scrollbar p-5) + sticky footer (border-t bg-muted/30 p-4) + DialogClose X button
- Hover-actions pattern: `absolute right-3 top-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100` + AlertDialog for destructive delete confirmation
- Loading state: `Loader2 className="h-4 w-4 animate-spin"` on pending buttons
- Mobile-first responsive: header `flex-col sm:flex-row`, grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## Verification

- `bun run lint` → **0 errors, 0 warnings** (exit 0)
- `bunx tsc --noEmit` → **0 errors** in `debts-section.tsx` & `templates-section.tsx`
  (pre-existing TS errors in `transaction-list.tsx`, `dashboard/route.ts`, `analytics/route.ts`, `budgets/status/route.ts` are out of scope and untouched)
- Dev server compiles cleanly (no errors related to new files in `dev.log`)

## Notes for Orchestrator

- Components export named exports (`DebtsSection` and `TemplatesSection`) — wire into page.tsx via AppShell sidebar tabs "Hutang & Piutang" and "Template"
- Edit template uses delete + recreate workaround because the API (Task T-A) only ships GET/POST/DELETE for `/api/templates` — no PUT/PATCH endpoint exists. If a PUT endpoint is added later, swap the edit handler in `TemplateFormDialog.handleSubmit` for a single `useUpdateTemplate().mutate({id, data})` call.
- Pre-existing `/api/transaction-groups` 500 error in dev.log (`db.transactionGroup.findMany` is undefined — likely missing Prisma model or schema push) is unrelated to this task; was failing before any T-DT changes.
