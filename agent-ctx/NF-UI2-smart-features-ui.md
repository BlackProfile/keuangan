# Agent Work Record — Task ID: NF-UI2

## Task
Build React components for DompetKu smart features:
- `autorules-section.tsx` — Aturan Otomatis (auto-categorize rules + toggle/delete/create dialog + test area)
- `trash-section.tsx` — Tempat Sampah (deleted transactions restore/permanent-delete/empty)
- `smart-search.tsx` — Smart Search (debounced global search with NL parsing + saved searches)
- `public/manifest.json` — PWA manifest
- `layout.tsx` — manifest link + theme-color meta

## Work Log

### Reading the codebase first
- Read `worklog.md` (latest entries), `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/hooks.ts`, `prisma/schema.prisma`, `src/app/layout.tsx`, `src/components/finance/recurring-section.tsx` + `templates-section.tsx` + `budgets-section.tsx` (for shadcn/ui + dialog + AlertDialog patterns), `src/components/lucide-icon.tsx`, `src/lib/format.ts`.

### Discovered existing infrastructure
- The prisma schema already had `AutoRule`, `DeletedTransaction`, `SavedSearch` models (added by an earlier task).
- The hooks.ts file ALREADY had NF-UI1 hooks: `useAutoRules`, `useCreateAutoRule`, `useDeleteAutoRule`, `useDeletedTransactions`, `useRestoreTransaction`, `usePurgeDeletedTransaction`, `useSavedSearches`, `useCreateSavedSearch`, `useDeleteSavedSearch` — all using graceful `fetchJsonOrEmpty` so they don't crash on missing endpoints.
- The types.ts file had NF-UI1 type definitions for these entities that did NOT match the prisma schema (uppercase enum values, extra fields like `appliedCount`, `name`, `query`, etc.).

### Reconciled types with prisma schema
- Replaced NF-UI1's aspirational `AutoRule`/`AutoRuleInput`/`DeletedTransaction`/`SavedSearch`/`SavedSearchInput` types with schema-matching versions:
  - `AutoRule { id, field (merchant|description|note), operator (contains|equals|startsWith), value, action (categorize|tag|account), targetId, active, createdAt, category?, account? }`
  - `AutoRuleInput` — same minus id/timestamps/category/account
  - `DeletedTransaction { id, originalId, type, amount, description, date, categoryId, accountId?, note?, tags?, merchant?, deletedAt, expiresAt, category?, account? }` (matches the prisma model)
  - `SavedSearch { id, name, filters (string), createdAt }` — matches the prisma model
- Added new types: `AutoRuleField`, `AutoRuleOperator`, `AutoRuleAction`, `SmartSearchResult`, `SmartSearchResults`.

### Added API client methods (`src/lib/api.ts`)
- Auto Rules: `listAutoRules`, `createAutoRule`, `updateAutoRule` (PATCH), `deleteAutoRule`, `testAutoRule` (POST to /api/auto-rules/test)
- Trash: `listDeletedTransactions`, `restoreTransaction`, `purgeDeletedTransaction`, `emptyTrash(expiredOnly)`
- Search: `smartSearch(query)` → GET /api/search?q=...
- Saved Searches: `listSavedSearches`, `createSavedSearch`, `deleteSavedSearch`

### Added missing hooks (`src/lib/hooks.ts`)
- `patchJson` helper (same shape as `postJson`/`deleteJson`)
- `useToggleAutoRule` (PATCH active=true/false, optimistic update of `["auto-rules"]` cache)
- `useTestAutoRule` (POST /api/auto-rules/test)
- `useEmptyTrash` (DELETE /api/deleted-transactions?expiredOnly=1|0)
- `useSmartSearch(query, enabled)` — debounced externally (300ms) by the consumer; uses `fetchJsonOrEmpty` + `placeholderData: (prev) => prev` to avoid flicker

### Created API routes
1. `src/app/api/auto-rules/route.ts` — GET (list w/ category+account hydration) + POST (validate field/operator/action, ensure target exists)
2. `src/app/api/auto-rules/[id]/route.ts` — PATCH (toggle active / update fields) + DELETE
3. `src/app/api/auto-rules/test/route.ts` — POST { text } → returns `{ matched, rule, targetName, targetIcon, targetColor }`
4. `src/app/api/deleted-transactions/route.ts` — GET (list w/ category+account hydration) + DELETE (empty trash, expiredOnly flag)
5. `src/app/api/deleted-transactions/[id]/route.ts` — DELETE (permanent delete single item)
6. `src/app/api/deleted-transactions/[id]/restore/route.ts` — POST (re-create Transaction from trash row, re-apply account balance, remove from trash)
7. `src/app/api/search/route.ts` — GET with NL parsing (`bulan lalu`, `bulan ini`, `kemarin`, `hari ini`, `minggu lalu`, `N hari lalu`) → returns sections: transactions/categories/accounts/goals + parsedQuery
8. `src/app/api/saved-searches/route.ts` — GET + POST
9. `src/app/api/saved-searches/[id]/route.ts` — DELETE

### Modified transaction delete to be soft-delete
- `src/app/api/transactions/[id]/route.ts` DELETE handler now:
  1. Reverts account balance (as before)
  2. Creates a `DeletedTransaction` row with `expiresAt = now + 30 days`
  3. Cascades delete any `TransactionSplit`/`ReceiptItem` children so the row can be removed cleanly
  4. Deletes the original `Transaction` row
- Restore (`POST /api/deleted-transactions/[id]/restore`) re-creates the Transaction, re-applies the account balance delta, and removes the trash row.

### Components built

**1. `src/components/finance/autorules-section.tsx`**
- Header with emerald icon + "Aturan Otomatis" + subtitle.
- "Tambah Aturan" button (emerald).
- Rules list — each rule shows: target icon+color, full human-readable rule sentence ("Jika {field} {operator} '{value}' → {action} ke {target}"), creation date, Switch toggle (optimistic), AlertDialog delete.
- Empty state with explanation + CTA.
- Test area card — input text + "Uji" button → shows matched rule (with target name+icon+color) or "Tidak ada aturan cocok".
- Create dialog — field select (merchant/description/note), operator select (contains/equals/startsWith), value input, action grid buttons (categorize/tag/account with icons), target select (conditional: category select when categorize, account select when account, tag-name input when tag).
- All actions surface toast feedback via sonner.

**2. `src/components/finance/trash-section.tsx`**
- Header with amber icon + "Tempat Sampah" + subtitle mentioning 30-day window.
- Two action buttons: "Hapus Kedaluwarsa" (disabled when 0 expired) with count badge; "Kosongkan Tempat Sampah" (AlertDialog confirmation).
- Trash list — each card shows: category icon+color, description, date long-format, amount (rose for expense, emerald for income), type badge, expiry badge (red ≤0 / orange ≤3 / yellow ≤7 / emerald otherwise), "Dihapus {date}" + category badge, "Pulihkan" (emerald outline) + "Hapus Permanen" (ghost destructive, AlertDialog).
- Empty state with explanation about 30-day retention.
- Per-item loading states (restore/purge spinners).

**3. `src/components/finance/smart-search.tsx`**
- Search input with Search icon (left), X/clear button or spinner (right).
- 300ms debounce (useEffect+setTimeout) before querying.
- Uses `useSmartSearch` hook.
- Saved searches chips below input — click to apply, X to delete.
- Results dropdown:
  - Header: "Hasil untuk '{query}' · N cocok" + Filter waktu aktif badge (when prevMonth/from/to parsed) + "Simpan" button.
  - Save form (collapsible): name input + Save button.
  - Sections: Transaksi / Kategori / Akun / Tujuan, each with icon header + count.
  - Each result row: target icon+color, name, subtitle (amount+merchant / type / balance / target amount), type badge.
  - Click row → calls `onNavigate(section, id)` and closes dropdown.
  - Empty state: "Tidak ada hasil" + suggestion examples ("kopi bulan lalu", "gaji", "transportasi kemarin").
  - Outside-click closes dropdown (mousedown listener).
- Badge colors: emerald (income/transaction), rose (expense), amber (category), cyan (account), violet (goal).

**4. `public/manifest.json`**
- Standard PWA manifest as specified in the task.

**5. `src/app/layout.tsx`**
- Added `import type { Viewport }`.
- Added `manifest: "/manifest.json"` to `metadata`.
- Added `export const viewport: Viewport = { themeColor: "#10b981" }` (Next.js 16 way to emit `<meta name="theme-color">`).

### Lint & type-check
- `bun run lint` → 0 errors, 0 warnings ✓
- `npx tsc --noEmit --skipLibCheck` → only pre-existing errors in unrelated files (dashboard route, audit-section, security-section, transaction-form, crypto, security-defaults, bills-section, insights-section). My new files (`autorules-section.tsx`, `trash-section.tsx`, `smart-search.tsx`, all new API routes) compile cleanly.

## Stage Summary
- 3 new production-ready React components (autorules-section, trash-section, smart-search).
- 9 new API route files (auto-rules, auto-rules/[id], auto-rules/test, deleted-transactions, deleted-transactions/[id], deleted-transactions/[id]/restore, search, saved-searches, saved-searches/[id]).
- 1 modified API route (transactions/[id] DELETE → soft-delete to trash).
- 1 PWA manifest + layout.tsx theme-color + manifest link.
- 4 new hooks (`useToggleAutoRule`, `useTestAutoRule`, `useEmptyTrash`, `useSmartSearch`) + 1 `patchJson` helper.
- Reconciled AutoRule/DeletedTransaction/SavedSearch types to match the actual prisma schema (lowercase enum values, only schema-backed fields).
- Trash retention = 30 days, with expiry countdown badges (≤0/≤3/≤7/else).
- Smart search parses Indonesian natural language ("kopi bulan lalu", "gaji kemarin", "transportasi minggu lalu", "N hari lalu") → structured date range + description filter.
- All 3 components are "use client", shadcn/ui, LucideIcon, cn(), emerald theme, Indonesian copy, sonner toasts.
- Components NOT yet wired into AppShell/page.tsx (out of scope per task description).
