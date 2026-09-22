# Agent Context: NF-UI1 — New Feature UI Components

**Task ID:** NF-UI1
**Agent:** nf-ui1 (React components for new feature sections)
**Scope:** Build 3 React components + append hooks/types for Bills, Subscriptions, AutoRules, DeletedTransactions, SavedSearches, PriceTracks, FinancialTips, Notifications features.

## Files Created / Modified

### Modified
1. **`/home/z/my-project/src/lib/types.ts`** — Appended NEW FEATURE TYPES block:
   - `BillingCycle`, `Bill`, `BillInput`, `Subscription`, `SubscriptionInput`
   - `AutoRuleField`/`AutoRuleOperator`/`AutoRuleAction`, `AutoRule`, `AutoRuleInput` (lowercase values matching backend Prisma schema)
   - `DeletedTransaction` (with `expiresAt`, `accountId`, `tags`)
   - `SavedSearch`/`SavedSearchInput` (filters as JSON string)
   - `PriceTrack` (`price`/`merchant` not `amount`/`store`), `PriceTrackGroup`, `PriceTrackListResponse` (matches backend's `{groups, total}` shape), `PriceTrackInput`
   - `FinancialTipCategory` (lowercase), `FinancialTip` (`content` not `body`)
   - `NotificationType` (BILL_DUE | BUDGET_ALERT | GOAL_MILESTONE | SUBSCRIPTION_RENEWAL | INSIGHT | REMINDER | SYSTEM | string), `AppNotification` (with `icon` field, no metadata/readAt/updatedAt), `NotificationInput`

2. **`/home/z/my-project/src/lib/hooks.ts`** — Appended:
   - 3 internal fetch helpers: `fetchJsonOrEmpty<T>`, `postJson<T>`, `deleteJson<T>` (reused `patchJson` from NF-UI2)
   - Bills: `useBills`, `useCreateBill`, `useMarkBillPaid`, `useResetBillsMonth` (URL: `/api/bills/reset`), `useDeleteBill`
   - Subscriptions: `useSubscriptions`, `useCreateSubscription`, `useToggleSubscription` (PATCH `/api/subscriptions/[id]` `{active}` with optimistic update), `useDeleteSubscription`
   - AutoRules: `useAutoRules`, `useCreateAutoRule`, `useDeleteAutoRule`
   - Deleted Transactions: `useDeletedTransactions`, `useRestoreTransaction`, `usePurgeDeletedTransaction` (collection-level DELETE)
   - Saved Searches: `useSavedSearches`, `useCreateSavedSearch`, `useDeleteSavedSearch`
   - Price Tracks: `usePriceTracks` (returns `{groups, total}`), `useCreatePriceTrack` (sends `price`/`merchant`), `useDeletePriceTrack` (kept for future-proofing)
   - Financial Tips: `useFinancialTips`
   - Notifications: `useNotifications` (60s poll), `useMarkNotificationRead`, `useMarkAllNotificationsRead` (fan-out individual calls), `useCreateNotification` (no metadata), `useClearReadNotifications` (renamed; bulk clear of read)

### Created
3. **`/home/z/my-project/src/components/finance/bills-section.tsx`** (~1100 lines)
   - Header "Tagihan & Langganan" + Tabs "Tagihan" | "Langganan"
   - BillsTab: 4 SummaryCards, Reset Bulan button, sorted bill cards with paid/unpaid toggle + due-day badge, BillFormDialog (name, amount, dueDay 1-31, category text input, account select, recurring switch, note)
   - SubscriptionsTab: 2 SummaryCards, sorted subscription cards with Switch active toggle + renewal-day badge + AlertDialog delete, SubscriptionFormDialog (name, amount, billingCycle, nextBilling via Calendar Popover, category text, 16-icon grid picker, 9-color dot picker, note)
   - Shared: `SummaryCard` (4 tones), `EmptyState` (icon + title + description + optional action)

4. **`/home/z/my-project/src/components/finance/insights-section.tsx`** (~820 lines)
   - 3-column grid: HealthScore, DailyTipCard, SmartInsightsCard
   - **HealthScore**: SVG circular progress (r=52) with framer-motion dasharray animation; score 0-100 from savingsRate/budget adherence/consistency; label "Sehat"/"Perlu Perhatian"/"Bahaya"
   - **DailyTipCard**: random tip from `useFinancialTips`, refresh button, fallback tip when empty, color from `TIP_CATEGORY_COLORS` map
   - **SmartInsightsCard**: 5 auto-generated insights (top category, MoM change, top merchant, top weekday, savings rate assessment)
   - **PriceTrackerCard** (full-width below): mini form (itemName/price/merchant), flattened entries from `tracksResponse.groups[].entries[]`, Termurah/Termahal badges using backend's pre-computed minPrice/maxPrice, show-more button

5. **`/home/z/my-project/src/components/finance/notifications-bell.tsx`** (~503 lines)
   - Bell button (ghost, icon) with animated red unread badge (caps at "99+")
   - Popover with notification list (ScrollArea max-h-96)
   - Each row: colored type icon, title, relative time, body (line-clamp-2), type label badge, "Tandai dibaca" inline button
   - Header: "Tandai Semua Dibaca" button (fan-out individual mark-read calls)
   - Footer: count + "Bersihkan dibaca" button (DELETE `/api/notifications` clears all read)
   - Empty state with emerald Inbox icon
   - **Auto-generation useEffect** (autoGenRanRef guard): pulls bills/budgets/goals, creates BILL_DUE/BUDGET_ALERT/GOAL_MILESTONE notifications; dedupe by exact body match (backend doesn't persist metadata)

## Critical: Backend Contract Reconciliation

Mid-task, the NF-API1 agent shipped API routes in parallel. I read each route.ts file to verify contracts and reconciled my UI to match the actual backend data shapes:

- Bill: `paid`+`paidMonth` → `paidThisMonth`; `categoryId` → `category` (string label)
- Subscription: `categoryId` → `category` (string label)
- PriceTrack: `amount` → `price`, `store` → `merchant`, response shape is `{groups, total}` not flat array
- FinancialTip: `body` → `content`, no `color`/`active`, lowercase category values
- AppNotification: has `icon` field, no `metadata`/`readAt`/`updatedAt`
- Reset URL: `/api/bills/reset-month` → `/api/bills/reset`
- Subscription toggle: POST `/api/subscriptions/[id]/toggle` (doesn't exist) → PATCH `/api/subscriptions/[id]` `{active}` with optimistic update
- Mark all read: backend has no batch endpoint → fan-out individual POST `/api/notifications/[id]/read` calls
- Delete notification: backend has only bulk DELETE `/api/notifications` (clears all read) → renamed hook to `useClearReadNotifications`, replaced per-row delete with footer-level bulk clear
- Price tracks delete: backend has no `/api/price-tracks/[id]` → removed delete button from UI; kept hook for future backend work
- Deleted transactions delete: collection-level DELETE `/api/deleted-transactions?expiredOnly=0|1` → updated `usePurgeDeletedTransaction` to accept boolean

## Verification

- `npx tsc --noEmit --skipLibCheck` (filtered to my files): **0 errors** ✓
- `bun run lint`: **0 errors, 0 warnings** ✓
- Dev server running healthy on port 3000, returning 200 OK for `/` route ✓

## Integration Notes (for orchestrator)

Components NOT yet wired into page.tsx/app-shell.tsx (out of scope). To surface them:

1. Add nav items to `NAV_GROUPS` in `src/components/layout/app-shell.tsx`:
   - `{ id: "bills", label: "Tagihan", icon: <ReceiptText className="h-4 w-4" /> }`
   - `{ id: "insights", label: "Insight", icon: <Sparkles className="h-4 w-4" /> }`
2. Extend `SectionId` type to include `"bills" | "insights"`
3. In `src/app/page.tsx` switch:
   - `{section === "bills" && <BillsSection />}`
   - `{section === "insights" && <InsightsSection />}`
4. For `NotificationsBell`: add `<NotificationsBell />` to both desktop header (line ~242 in app-shell.tsx) and mobile header (line ~233) — replacing or alongside `<ThemeToggle />`.

## Open Backend Gaps (logged for NF-API1 follow-up)

- No `/api/price-tracks/[id]` DELETE — UI hides delete button on price tracks
- No `/api/notifications/mark-all-read` batch endpoint — UI fans out individual calls (works but slower for many unread)
- No `/api/notifications/[id]` DELETE — UI replaced per-row delete with footer-level "Bersihkan dibaca" (clears ALL read notifications)
- Notifications schema has no metadata column — auto-gen dedupes by body string match (works for distinct bodies, may collide if same bill is due twice in same month)
