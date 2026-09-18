# SH-PAGE — Public Share Page for DompetKu

## Agent: sub-agent (general-purpose)
## Task ID: SH-PAGE
## Status: ✅ Complete

## Files Created

All under `/home/z/my-project/src/app/share/[token]/`:

1. **`page.tsx`** (Server Component, ~340 LOC)
   - `export const dynamic = "force-dynamic"`
   - `generateMetadata()` for SEO + OpenGraph previews
   - 5 state branches: not-found / expired / password-gate / email-gate / public-view
   - `fetchShareData()` helper mirrors `/api/shares/[token]/data` logic (scope filtering + privacy masks)
   - `fetchShareComments()` helper for initial comments
   - Link sanitization: `passwordHash` set to `null` before passing to client (never exposed)

2. **`share-states.tsx`** (Server Components)
   - `ShareNotFound` — FileQuestion icon, "Link tidak ditemukan"
   - `ShareExpired({ reason })` — Clock icon (amber), "Link sudah kedaluwarsa" + reason

3. **`not-found.tsx`** (Next.js default not-found for the segment)
   - Same UI as ShareNotFound, triggers on unmatched sub-routes or `notFound()` calls

4. **`share-auth-gate.tsx`** ("use client", ~210 LOC)
   - Props: `{ token, mode: "password" | "email", emailHint? }`
   - Full-screen centered card with emerald gradient + blurred blobs
   - DompetKu branding, Lock/Mail icon, "Akses Dibutuhkan" title
   - Password mode: password input + eye toggle + "Buka Akses" button
   - Email mode: email input + masked email hint (e.g. "j••@gmail.com")
   - POST /api/shares/[token]/verify → on 200 reload page, on 401 toast error

5. **`share-page-client.tsx`** ("use client", ~1230 LOC)
   - Props: `{ token, link, data, comments, viewsRemaining, viewCount }`
   - Custom theme color applied as `--share-theme` CSS variable
   - Layout: sticky header → main (max-w-5xl) → sticky footer with `mt-auto`
   - Sections: ShareHeader / SummaryHero / HiddenAmountsBanner / ShareCharts / ShareTransactionList / ShareComments / ShareExportActions / ShareFooter
   - Hero gradient uses `linear-gradient(themeColor, darken(themeColor, 0.18))`
   - Charts: Recharts BarChart (monthly trend) + PieChart (expense by category) with custom tooltips that respect `hiddenAmounts`
   - Transaction list: grouped by `relativeDay()`, day headers show income/expense totals + count badge, masked amounts show "Rp••••"
   - Comments: form with author input + transaction picker (lists up to 50 transactions) + content textarea. Reply-to workflow: clicking row's comment button sets `replyToTransaction` state, scrolls to comments, pre-selects transaction.
   - Export: CSV (with BOM for Excel UTF-8) + Print (window.print)
   - Footer: branding (if !hideBranding) + view count + created date + access level

## Critical Fix (Pre-existing Structural Issue)

The dev server was crashing on startup with:
```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'token').
```

**Root cause:** SH-API agent had created BOTH `/api/shares/[id]/route.ts` (PUT/DELETE by id) AND `/api/shares/[token]/route.ts` (GET by token). Next.js forbids different slug names at the same dynamic level.

**Fix:** Merged PUT/DELETE handlers from `[id]/route.ts` into `[token]/route.ts`. Added `findShareLinkByIdentifier()` helper that tries findUnique by `id` first, then by `token` (so management API works with either identifier). Deleted the `[id]` folder.

Existing `api.ts` client calls (`api.updateShare(id, ...)`, `api.deleteShare(id)`) continue to work unchanged because the URL path `/api/shares/{id}` is handled by the merged route — `token` slug captures the id value, and the helper looks it up by id.

## Verification

Live tests on dev server port 3000:

| Test Case | Result |
|-----------|--------|
| Normal share link (COMMENT, ALL) | 200, all sections render (DompetKu, Total Saldo, charts, transactions, comments, export, footer) |
| Hidden amounts link (hiddenAmounts + maskedDesc) | 200, "Rp••••••" for saldo, "Rp••••" for income/expense, "Nominal disembunyikan" banner, "Rp•••" in charts |
| Password-protected link | 200, "Akses Dibutuhkan" gate with Password input + "Buka Akses" button |
| Email-gated link | 200, "Akses Dibutuhkan" gate with Email input + masked hint |
| Expired link (expiresAt=2020-01-01) | 200, "Link sudah kedaluwarsa" with reason |
| Non-existent token | 200, "Link tidak ditemukan" |
| Password verify (wrong) | 401 `{"error":"Password salah"}` |
| Password verify (correct) | 200 `{"verified":true}` |
| Comment submission | 201 with created ShareComment shape |
| List comments | 200 with array |

- `bun run lint` → **0 errors, 0 warnings**
- `bunx tsc --noEmit --skipLibCheck` → 0 errors in new share page files (pre-existing errors in dashboard/route.ts, crypto.ts, examples/*, skills/* untouched)
- Dev server starts cleanly after merge (Ready in ~1.1s)

## Key Design Decisions

1. **Server Component for initial fetch** — avoids client-side loading flash; the page is fully rendered server-side and sent as HTML. Auth gates and interactive sections are client components.

2. **Reuse of data fetch logic** — `fetchShareData()` is duplicated from `/api/shares/[token]/data/route.ts` (slightly different return shape — typed object vs JSON). Could be extracted to `lib/share-data.ts` for DRY, but kept inline to avoid touching the existing API.

3. **Reply-to-transaction workflow** — clicking a row's comment button sets `replyToTransaction` state in the parent (`SharePageClient`), passed down to `ShareComments` which syncs to its `transactionId` form state via useEffect + shows a "Membalas transaksi: {description}" banner with a clear button.

4. **Privacy end-to-end** — `hiddenAmounts` affects ALL currency displays (saldo, income/expense compact, charts Y-axis, tooltips, transaction rows, CSV export). `maskedDesc` truncates descriptions to 10 chars + "..." and masks notes with "***".

5. **Custom theme color** — applied as `--share-theme` CSS variable on the root wrapper. Used in hero gradient (with `darken()` helper for the secondary color) and header logo background.

6. **Branding toggle** — `link.hideBranding` hides the header logo + footer brand block, so white-labeled shares look like the owner's own page.
