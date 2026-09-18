# Task 6-BG — budgets-section.tsx & goals-section.tsx

Agent: sub-agent (general-purpose)
Task: Build React components for "Anggaran" (budgets) and "Target Tabungan" (goals) sections of DompetKu.

Reference:
- Pattern: `/src/components/finance/category-manager.tsx` (dialog + CRUD)
- Card styling: `/src/components/finance/summary-cards.tsx`
- Chart patterns: `/src/components/finance/charts.tsx`

Available hooks (in `@/lib/hooks`):
- useBudgets, useBudgetStatuses, useCreateBudget, useUpdateBudget, useDeleteBudget
- useCategories, useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal

Types (in `@/lib/types`): BudgetStatus, Goal, GoalInput, BudgetInput, Category, BudgetPeriod.

Constants (in `@/lib/constants`): GOAL_ICONS, GOAL_COLORS.

## Plan

### budgets-section.tsx
- Header: title "Anggaran" + subtitle + "Tambah Anggaran" button
- Summary strip: total budget, total spent, total remaining (3 mini cards)
- List of budget cards (grid 1 / md 2) from useBudgetStatuses:
  - Category icon + name + period + amount
  - Progress bar colored by status (safe=green, warning=yellow, danger=orange, over=red)
  - Spent vs budget amounts
  - Percentage + remaining
  - Status badge
  - Hover edit & delete buttons (AlertDialog)
- Add/Edit Dialog: category select (EXPENSE not already budgeted), amount, period
- Empty state + loading skeletons

### goals-section.tsx
- Header: title "Target Tabungan" + "Tambah Target" button
- Grid of goal cards (1 / sm 2 / lg 3)
- Each card: SVG progress ring with color, icon, name, target date, current/target amounts, %, "Tambah Setoran" button, hover edit & delete, "Selesai" badge when completed
- Add/Edit Dialog: name, targetAmount, currentAmount, targetDate (Popover+Calendar), icon picker (GOAL_ICONS), color picker (GOAL_COLORS)
- Contribution Dialog: small amount input → PATCH currentAmount via useUpdateGoal
- Empty state + loading skeletons

## Status
- COMPLETED

## Files Created
- `/src/components/finance/budgets-section.tsx` (export BudgetsSection)
- `/src/components/finance/goals-section.tsx` (export GoalsSection)

## Verification
- `bun run lint` → 0 errors in new files (1 pre-existing warning in accounts-section.tsx untouched)
- `bunx tsc --noEmit` → 0 errors in budgets-section.tsx & goals-section.tsx
- Dev server log: clean compilation, no errors related to new files

## Worklog
- Appended Task ID 6-BG section to `/worklog.md` with detailed work log + stage summary

