# Task ID: EX-SEC — Export Section Component

**Agent**: sub-agent (general-purpose)
**Scope**: Build the Export section UI for DompetKu (Next.js 16 finance app) — config panel + live preview + templates management.

## Context Reviewed
- Prior worklog (Tasks 1–EX-API) — EX-API subagent already created all 7 export endpoints + ExportTemplate CRUD.
- `lib/api.ts` exports `api.exportPreview`, `api.exportPdfUrl/ExcelUrl/CsvUrl/JsonUrl`, `api.listExportTemplates`, `api.createExportTemplate`, `api.deleteExportTemplate`.
- `lib/hooks.ts` exports `useExportPreview` (mutation), `useExportTemplates` (query), `useCreateExportTemplate`, `useDeleteExportTemplate`, `useAccounts`, `useCategories`, `useGroups`, `useTags`.
- `lib/types.ts` exports `ExportPreview`, `ExportTemplate`, `ExportScope`, `ExportOptions`, `ExportReportType`, `Transaction`.
- Reference components: `shares-section.tsx` (card+dialog), `budgets-section.tsx` (stats strip + progress bar + AlertDialog), `templates-section.tsx` (template card + CRUD mutation patterns).
- `app-shell.tsx` already had the sidebar entry `{ id: "export", label: "Export Data", icon: <Download/> }`.

## Files Created/Modified
1. **`src/components/finance/export-section.tsx`** (NEW, ~1790 LOC, "use client") — the full Export section.
2. **`src/app/page.tsx`** — added `import { ExportSection }` + `{section === "export" && <ExportSection />}` next to the existing SharesSection rendering.

## Features Implemented
### Layout
- Header "Export Data" + subtitle, "Simpan Template" outline button.
- `lg:grid-cols-12` 2-column layout: left config (`lg:col-span-5`, sticky), right preview (`lg:col-span-7`, sticky). Mobile: stacked.
- Templates section below main grid in a separate Card.

### Config Panel (left)
1. **Pilih Format** — 4 selectable cards (PDF/Excel/CSV/JSON), Lucide icons, accent tinted, emerald ring + check on selected.
2. **Tipe Laporan** — Select with 12 ExportReportType values, Indonesian labels.
3. **Cakupan Data** — 7 scope-type pill buttons + dynamic detail editor (account/category/group select, tag input + chips, date range inputs, hint for ALL/CUSTOM).
4. **Pilih Field** — 3-col checkbox grid with 12 fields (date, type, amount, description, category, account, merchant, note, tags, mood, priority, paymentMethod) + "Pilih Semua"/"Kosongkan" + counter.
5. **Opsi Lanjutan** — 3 Switch rows (includeHidden, showSummary, showCharts), title Input, watermark Input, groupBy Select.
6. **Unduh Export** — 4 export buttons (primary PDF, outline Excel/CSV/JSON) + "Export Semua Format" secondary. Loader2 spinner while downloading; all disabled during any download.

### Live Preview Panel (right)
- Debounced 500ms preview via `useExportPreview` mutation in `useEffect` (deps: scope, fields, options — all `React.useMemo`'d).
- Skeleton state when initial load, empty state when no transactions.
- Estimated file size badge (emerald).
- Summary cards: total income/expense/balance/count with tone colors.
- Date range: from — to via `formatDate`.
- Top 5 categories with progress bars (`bg-emerald-500` width = percentage).
- Top 5 merchants with rank badges.
- Transaction table (max-h-96 scroll, custom scrollbar) rendering ONLY selected fields. Income emerald with `+`, expense rose with `-`. Footer "Menampilkan 10 dari N transaksi".

### Download Implementation
Per spec snippet — `fetch(url[fmt], { method: "POST", body: JSON.stringify({ scope, fields, options }) })` → `blob()` → `URL.createObjectURL` → `a.download = dompetku-export-YYYY-MM-DD.{xlsx|pdf|csv|json}` → `a.click()` → `URL.revokeObjectURL(a.href)` → `toast.success`. `downloadAllFormats()` runs the 4 sequentially with single summary toast.

### Templates Section
- Card grid of saved templates: name, report type label, format badge (color-coded per format), scope type, preset badge for `isPreset`.
- "Gunakan" button: applies template config (format/reportType/scope/fields/options) to current state.
- Delete button: AlertDialog confirmation, protected for `isPreset`.

### Save Template Dialog
- Input name + live summary (format/tipe/cakupan/field count). On submit calls `useCreateExportTemplate().mutate({ name, format, reportType, scope, fields, options })`.

## Design Decisions
- **TypeScript**: kept `ExportFormat` (uppercase `"PDF"|"EXCEL"|"CSV"|"JSON"`) for the format state (used by template creation), but introduced lowercase `DownloadFormat = "pdf"|"excel"|"csv"|"json"` for the download state + functions (matches the URL record keys + file extension comparison in the spec snippet exactly).
- **Debounced preview**: 500ms `setTimeout` in `useEffect`, cleared on cleanup. No eslint-disable needed because `previewMut.mutate` is stable and `scope/fields/options` are memoized.
- **Sticky panels**: both left config + right preview use `lg:sticky lg:top-4` so preview stays visible while scrolling the config form.
- **Styling**: emerald theme throughout (`bg-emerald-600 hover:bg-emerald-700` for primary buttons, `text-emerald-700 dark:text-emerald-400` for accents, `bg-emerald-100 dark:bg-emerald-500/15` for tints, `border-emerald-500` for selected rings). Rose for expenses. No indigo/blue.
- **Responsive**: `grid-cols-2 sm:grid-cols-4` for format cards, `grid-cols-2 sm:grid-cols-3` for field checkboxes, `grid-cols-1 sm:grid-cols-2` for templates. Mobile-first stacking.
- **Accessibility**: `aria-pressed` on toggle buttons, `role="progressbar"` with `aria-valuenow` on progress bars, `aria-label` on icon-only delete buttons, semantic `<button>` + `<label>` for field checkboxes.

## Verification
- `bun run lint` → **0 errors, 0 warnings** (exit 0).
- `bunx tsc --noEmit --skipLibCheck` → 0 errors in `export-section.tsx`.
- Dev server still running cleanly after wiring.

## Integration Point
The sidebar entry for "Export Data" was already registered in `app-shell.tsx` (line 101). Only `page.tsx` needed the import + conditional render added — done in 2 lines alongside the existing `SharesSection` block.
