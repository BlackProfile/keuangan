# STU-UI — Student UI Components

**Task ID:** STU-UI
**Agent:** student-ui-builder
**Scope:** Build 3 production-quality React components for DompetKu student features.

## Files Created

1. `src/components/finance/jajan-button.tsx` — Floating quick-jajan button.
2. `src/components/finance/student-section.tsx` — Student dashboard (Uang Saku + Quick Jajan + Gamification + Challenges).
3. `src/components/finance/patungan-section.tsx` — Split bills + friend debts management.

## Implementation Notes

### jajan-button.tsx
- Floating emerald button at `fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-30` (above existing mobile FAB at `bottom-5 right-5 z-50`).
- Opens a bottom `Sheet` (mobile-friendly) with `JAJAN_PRESETS` grid (2/3 cols) + custom input form at the bottom.
- Each preset click → creates an `EXPENSE` transaction via `useCreateTransaction` with `time = now HH:MM`, `date = today`. Toast confirmation + auto-close sheet on success.
- Custom form: amount + description, fallback category "Makanan". Uses `useJajanCheck` to show AI verdict (can afford / not) inline above submit.
- `resolveCategoryId()` resolves category by exact/partial name match (case-insensitive).

### student-section.tsx
- **Hero Uang Saku card** (emerald gradient). If no profile → empty state with "Atur Uang Saku" CTA. If profile exists → monthly allowance (large), daily & monthly mini-cards with progress bars, projection message footer (green when safe, amber when `willRunOutDay != null`), academic mode badge.
- **StudentProfileDialog**: form with monthlyAllowance, allowanceDay (1-28), academicMode (ACADEMIC_MODES), semester, university, major, academicYear. Edit/create via `useUpdateStudentProfile`.
- **QuickJajanGrid**: 2-col mobile / 4-col desktop grid of `JAJAN_PRESETS`, plus a "Jangan lain" dashed button → opens `CustomJajanDialog`.
- **GamificationStats**: Level (from totalXP = sum of participations.xpEarned + transactionCount * 10) using `XP_PER_LEVEL` + `LEVEL_MILESTONES`, XP progress bar, streak (from dashboard), transaction count, fun fact (from `FUN_FACTS` matched against `remainingThisMonth`).
- **Challenges**: `useChallenges` + `useChallengeParticipations`. Available challenges grid with "Gabung" button (or progress bar if joined). Active participations card with progress, days remaining, abandon (alert dialog). Completed participations shown as badges with checkmark + XP.
- `useDailyAllowance` already auto-refetches every 60s (matches task requirement).

### patungan-section.tsx
- Header with "Tambah Hutang" + "Buat Patungan" buttons.
- **Stats strip** (3 cards): total saya berhutang (DEBT, !settled), total teman berhutang (RECEIVABLE, !settled), total patungan belum settle.
- **Split Bills**: cards show icon (by category), title, total, paidBy, date, category badge, paid/lunas badge, participants list with paid checkbox + "Tandai Lunas" button, "Settle Semua" + delete (alert dialog). Empty state.
- **SplitBillFormDialog**: title, totalAmount, paidBy, splitType (EQUAL/CUSTOM), category select (SPLIT_BILL_CATEGORIES), dynamic participants list (add/remove, share auto-computed for EQUAL), note. Validates min 2 participants and share sum == total for CUSTOM.
- **Friend Debts**: Tabs ("Saya Berhutang" / "Teman Berhutang"). Each card: friendName, amount (colored by type), description, date, dueDate with overdue badge, settle + delete. Per-tab empty state.
- **FriendDebtFormDialog**: type, friendName, amount, description, dueDate (date input, min today), note.

## Style / Conventions
- All files use `"use client"`, shadcn/ui (Button, Card, Badge, Dialog, AlertDialog, Sheet, Tabs, Input, Label, Textarea, Select, Skeleton), LucideIcon for dynamic icon names, `cn()` for class composition.
- Emerald theme throughout (no indigo/blue).
- Indonesian copy, `toast` from `sonner`.
- Consistent dialog pattern: header w/ X close, scrollable body, sticky footer w/ Batal + submit.
- All API requests use relative paths (hooks already do this).

## Lint Result
`bun run lint` → **0 errors, 0 warnings** after removing 2 unused `eslint-disable` directives.

## Hooks Consumed
- `useStudentProfile`, `useUpdateStudentProfile`, `useDailyAllowance`
- `useChallenges`, `useJoinChallenge`, `useChallengeParticipations`, `useAbandonChallenge`
- `useSplitBills`, `useCreateSplitBill`, `useDeleteSplitBill`, `useSettleSplitBill`, `useMarkParticipantPaid`
- `useFriendDebts`, `useCreateFriendDebt`, `useSettleFriendDebt`, `useDeleteFriendDebt`
- `useJajanCheck`, `useCategories`, `useCreateTransaction`, `useDashboard`

## Integration Note
The components are not yet wired into `src/app/page.tsx` / `AppShell`. To surface them in the app:
- Add `<StudentSection />` and `<PatunganSection />` to the section switcher.
- Render `<JajanButton />` once near the page root (so the floating button is always visible).
