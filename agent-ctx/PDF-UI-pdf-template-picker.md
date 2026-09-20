# Task ID: PDF-UI
Agent: PDF template picker gallery (frontend only)

## Task
Add a PDF template picker gallery to the Export section UI for DompetKu. Visible only when `format === "PDF"`. Placed between the format picker and the scope (Tipe Laporan) section. Wire `templateId` into preview fetch + download POST body.

## Context Referenced
- `/home/z/my-project/worklog.md` — overall project history (DompetKu, Next.js 16, emerald theme, ID locale)
- `/home/z/my-project/src/lib/pdf-templates.ts` — exports `PDF_TEMPLATES` (25 templates) and `PDF_TEMPLATE_CATEGORIES`. Each template has `id`, `name`, `description`, `category` (`style | report | audience | student`), `emoji`, and `theme` with `primary/secondary/accent` hex colors.
- `/home/z/my-project/src/components/finance/export-section.tsx` — existing Export section (1843 lines before edits). Has `SectionTitle` (with `step` number badge), `FormatCard`, `ScopeTypeButton` helpers. Layout uses a 12-col grid: left col `lg:col-span-5` (sticky config card) + right col `lg:col-span-7` (live preview). Steps numbered 1-4. Existing theme: emerald accents, dark-mode aware via `dark:` variants.

## Work Log
1. **Imports** — added `Palette`, `Users`, `GraduationCap` to lucide-react import (for category tab icons). Added `PDF_TEMPLATES`, `PDF_TEMPLATE_CATEGORIES`, `type PdfTemplateId` imports from `@/lib/pdf-templates`.
2. **Constants** — added `PdfCategoryFilter` type ("all" | "style" | "report" | "audience" | "student"), `PDF_CATEGORY_TABS` array (5 tabs: Semua, Gaya Tampilan, Tipe Laporan, Untuk Siapa, Mahasiswa with icons), and `pdfCategoryLabel(cat)` helper that looks up the human label from `PDF_TEMPLATE_CATEGORIES`.
3. **State** — added `pdfTemplateId` (default `"minimal-clean"`) and `pdfCategory` (default `"all"`) via `React.useState`.
4. **Computed** — `filteredPdfTemplates` and `selectedPdfTemplate` via `React.useMemo` so the JSX stays declarative.
5. **Preview fetch** — updated debounced `previewMut.mutate` to spread `options` and add `templateId: pdfTemplateId`. Added `pdfTemplateId` to the effect's dependency array so preview re-fetches on template change.
6. **Download POST** — updated `downloadExport` body from `{ scope, fields, options }` to `{ scope, fields, options: { ...options, templateId: pdfTemplateId } }` per task spec.
7. **Template Picker UI** — inserted JSX between format cards (`</div>` after `FORMATS.map`) and `{/* 2. Tipe Laporan */}` block, wrapped in `{format === "PDF" && (...)}`. Contains:
   - Section header: emerald LayoutTemplate icon in circle badge + title "Template PDF" + description "Pilih gaya template untuk PDF Anda"
   - Category filter tabs (pill buttons, emerald when active, matches `ScopeTypeButton` styling)
   - Grid: `grid-cols-2 sm:grid-cols-3` inside `max-h-96 overflow-y-auto custom-scrollbar` (uses existing scrollbar CSS in `globals.css`)
   - Each card: emoji + name (line-clamp-1) + description (line-clamp-2) + category badge + 3 color dots (primary/secondary/accent). Selected card gets emerald border + emerald-50 bg + top-right check badge (matches `FormatCard` styling)
   - Footer: emerald-tinted box with "Template terpilih:" + selected template emoji+name (fallback to id if not found)
8. **Accessibility** — `aria-pressed` on all toggle buttons, `aria-hidden="true"` on decorative emoji/dots, `title={description}` on each card for tooltip, `truncate` on selected name to prevent overflow.
9. **Responsive** — 2 columns on mobile, 3 on `sm+`. Max-height scroll keeps the picker compact on small screens. Buttons use `flex-wrap` so they wrap gracefully.
10. **Lint** — `bun run lint` passes clean (0 errors, 0 warnings).

## Files Modified
- `src/components/finance/export-section.tsx` only.

## Decisions / Rationale
- Placed the section between format cards and step-2 "Tipe Laporan" exactly as specified. Did NOT renumber steps — the picker is a sub-section of format choice (the emerald badge uses an icon, not a number, to signal it's a refinement rather than a new step).
- Used inline `style={{ backgroundColor }}` for the 3 color dots since Tailwind can't generate dynamic colors from hex strings in `theme`. This is safe (no user-controlled CSS injection — colors come from static template data).
- Used `useMemo` for `filteredPdfTemplates`/`selectedPdfTemplate` to keep render cheap when category tabs are toggled (avoids re-filtering 25 items on every render).
- Did not modify `downloadExportSilent` (used by "Export All") to keep changes minimal per task spec. Backend can ignore `templateId` for non-PDF endpoints.

## Stage Summary
- PDF template picker gallery fully integrated into Export section.
- Visible only when `format === "PDF"`.
- 25 templates across 4 categories, filterable via 5 tabs.
- Preview + download now send `templateId` to backend (templateId spreads into options).
- Lint clean, dev server shows successful recompile.
