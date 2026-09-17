# Task 6-AC — analytics-section.tsx & calendar-section.tsx

Agent: sub-agent (general-purpose)
Task: Build React components for "Analitik" (analytics) and "Kalender" (calendar) sections of DompetKu.

## Reference (prior work)

- Pattern: `/src/components/finance/dashboard-tab.tsx` (month nav: viewDate + prevMonth/nextMonth + isCurrentMonth disable next)
- Pattern: `/src/components/finance/charts.tsx` (Recharts BarChart / PieChart + custom TooltipContent + explicit INCOME/EXPENSE hex colors)
- Pattern: `/src/components/finance/transaction-list.tsx` (list row layout, EmptyState, Skeleton rows)
- Pattern: `/src/components/finance/summary-cards.tsx` (StatCard gradient)
- Hooks: `useAnalytics(month)`, `useTransactions(params)` in `@/lib/hooks`
- Types: `AnalyticsData` (monthComparison / topMerchants / topCategories / heatmap / forecast / ratios / insights / monthlyTrend / weekdaySpending), `Transaction` in `@/lib/types`
- Format helpers: `getMonthKey`, `getMonthYearLabel`, `formatDateInput`, `parseDateLocal`, `WEEKDAYS_ID`, `getWeekdayMondayFirst`, `formatCurrency`, `formatCurrencyCompact`, `formatCurrencyAxis`, `formatPercent` in `@/lib/format`
- Chart colors: income `#10b981`, expense `#f43f5e` (explicit hex, not CSS vars)
- Analytics API: `/api/analytics?month=YYYY-MM` already built (Task 3-B) — returns full AnalyticsData

## Plan

### analytics-section.tsx
- Header: title "Analitik" + icon + month nav (chevron prev/next + month label, disable next on current month like dashboard)
- ComparisonRow: 3 cards (Pemasukan / Pengeluaran / Sisa Saldo) — current value (big) + change % (with sign via `formatPercent(change, true)`) + previous value; income/balance: green if change>0; expense: inverse (green if change<0)
- InsightsCard: list of insight strings, each with a Lightbulb icon
- RatiosCard: 3 RatioRow (Savings Rate ideal ≥20%, Rasio Pengeluaran ideal <70%, Rasio Pemasukan/Pengeluaran ideal ≥1,5×) — progress bar colored emerald/amber/rose by status
- TopMerchantsCard: list of top 8 merchants with rank badge + name + amount + count + horizontal bar proportional to max
- TopCategoriesCard: PieChart with top 5 expense categories (cell color from category.color), legend list with mini progress bars
- WeekdaySpendingCard: BarChart 7 bars (Sen–Min) with EXPENSE_COLOR
- MonthlyTrendCard: LineChart with 2 lines (income/expense) — filter leading zero months
- ForecastCard: 3 forecast stat tiles (predicted income/expense + savings rate) for next month based on 3-month avg + footnote
- AnalyticsSkeleton + EmptyAnalytics fallbacks

### calendar-section.tsx
- Header: title "Kalender" + icon + month nav (prev/next + month label) + "Hari ini" button (allows free navigation both ways)
- Build calendar grid locally: `getWeekdayMondayFirst(firstDayOfMonth)` leading blanks + daysInMonth + trailing blanks; `formatDateInput` for date keys
- useTransactions({from: monthStart, to: monthEnd}) for the month; group by date client-side for cell summaries (income/expense/count per day + maxAmount for bar scaling)
- Day cell: day number + count badge + mini vertical bars (income green, expense red, height proportional to maxAmount, min 15%) + compact net amount (color-coded, hidden if 0)
- Today highlighted with border-primary ring; selected day with bg-primary/10 + border-primary
- Click day → Dialog showing that day's transactions (uses `useTransactions({from: to: dateKey})`), with day totals strip + scrollable list (icon + description + category + amount)
- Below grid: 4 summary cards (Pemasukan / Pengeluaran / Selisih / Transaksi count)
- CalendarSkeleton fallback

## Status
- COMPLETED

## Outcome
- 2 file komponen React production-quality dibuat: analytics-section.tsx (~700 LOC) dan calendar-section.tsx (~370 LOC)
- `bun run lint` → 0 errors, 0 warnings
- `bunx tsc --noEmit` → 0 errors di 2 file baru (pre-existing TS errors di /api routes tidak di-touch)
- Named exports: `AnalyticsSection` dan `CalendarSection`
- Komponen siap di-wire ke page.tsx oleh orchestrator
