# Task SH-SEC: ShareLink Management Section

**Agent**: share-section-builder (sub-agent)
**Task**: Build comprehensive ShareLink management section for DompetKu finance app.

## Context

Prior work consulted (from `/agent-ctx/` and `/worklog.md`):
- Tasks 1–9: base finance app (transactions, budgets, goals, accounts, recurring).
- S-API, S-LOCK, S-SET: security infrastructure (Settings, LockScreen, audit, biometric).
- SH-API (prior): 9 share API route files already existed (`/api/shares/**`).

Reference components reviewed for style:
- `src/components/finance/budgets-section.tsx` — card list + AlertDialog confirm pattern + SummaryMini strip.
- `src/components/finance/goals-section.tsx` — CRUD with Dialog + Popover+Calendar date picker.
- `src/components/finance/security-section.tsx` — comprehensive 3-tab dialog with Switch toggles.

## Infrastructure Verified

- `lib/types.ts`: `ShareLink`, `ShareLinkInput`, `ShareAccessLevel`, `ShareScopeType` (with `_count?: { views, comments }`).
- `lib/share-helpers.ts`: `SHARE_ACCESS_LEVELS`, `SHARE_SCOPE_TYPES`, `SHARE_THEME_COLORS`, `SHARE_EXPIRY_PRESETS`, `generateShareToken`, `buildShareUrl`, `isShareExpired`, `viewsRemaining`.
- `lib/hooks.ts`: existing `useAccounts`, `useCategories`, `useGroups`, `useTags` hooks available.
- API routes (already present from SH-API): `/api/shares`, `/api/shares/[id]`, `/api/shares/[token]/revoke`, `/api/shares/[token]/clone`.

## Work Done

### 1. `src/lib/api.ts` — Added 6 share API methods
- `listShares()` GET `/api/shares`
- `createShare(data)` POST `/api/shares`
- `updateShare(id, data)` PUT `/api/shares/[id]`
- `deleteShare(id)` DELETE `/api/shares/[id]`
- `revokeShare(token)` POST `/api/shares/[token]/revoke`
- `cloneShare(token)` POST `/api/shares/[token]/clone`

### 2. `src/lib/hooks.ts` — Added 6 share hooks
- `useShareLinks()` — GET query (`queryKeys.shares`)
- `useCreateShareLink()` — POST mutation
- `useUpdateShareLink()` — PUT mutation
- `useDeleteShareLink()` — DELETE mutation
- `useRevokeShareLink()` — POST `/token/revoke` mutation
- `useCloneShareLink()` — POST `/token/clone` mutation
- All mutations invalidate `queryKeys.shares` on success.

### 3. `src/components/finance/shares-section.tsx` (NEW, ~1900 LOC)

**Layout:**
- **Header**: Title "Link Berbagi" + subtitle + "Buat Link Baru" primary button.
- **Stats strip** (4 StatCards): Total Link Aktif (active+non-expired, primary tone), Total Views (sum viewCount), Total Komentar (sum `_count.comments`), Link Kadaluarsa (danger tone).
- **Share list**: Grid of `ShareCard` (1 col mobile, 2 col md+).
- **Empty state**: icon + "Belum ada link berbagi" + CTA.
- **Loading**: 4 Skeleton cards.

**ShareCard features:**
- Theme-colored icon + title + scope label (e.g. "Akun: Tunai") + access level Badge (colored).
- Stats row: viewCount, comment count, password/email icons.
- Status: green/red/gray dot (Active/Expired/Revoked) + expiry label ("Berlaku hingga {date}" / "{n}x tersisa" / "Sekali pakai" / "Permanen").
- Created date footer.
- Action buttons: "Salin" (clipboard + toast), "QR" (opens dialog), "WhatsApp" (wa.me), DropdownMenu (Edit, Duplikasi, Cabut, Hapus via AlertDialog).

**QrCodeDialog:**
- 200x200 QR image from `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(url)}`.
- Title + URL display + "Salin Link" button with check feedback.

**Create/Edit Dialog (max-w-2xl, 3 Tabs):**
- **Tab 1 "Konten"**: Title (required), Message Textarea, 4 access-level cards (VIEW/COMMENT/WRITE/ADMIN), 7 scope-type cards (ALL/ACCOUNT/CATEGORY/GROUP/TAG/DATE_RANGE/CUSTOM), dynamic `ScopeDetailEditor`.
- **Tab 2 "Keamanan & Masa Berlaku"**: Expiry preset buttons, custom expiry (Popover+Calendar), maxViews, hoursActive, maxConcurrent, oneTime Switch, password Switch+Input, email Switch+Input (with regex validation), IP whitelist Textarea, hiddenAmounts Switch, maskedDesc Switch.
- **Tab 3 "Tampilan"**: Theme color picker (10 swatches), hideBranding Switch, language Select (id/en), live Preview card (`SharePreview`).
- **Footer**: URL preview (truncated) + Cancel + Save buttons.
- **Validation**: title required, password ≥4 chars, email format. Auto-switches to relevant tab on error.

### 4. App Navigation Integration
- `src/components/layout/app-shell.tsx`: Added `"shares"` to `SectionId` union + "Link Berbagi" nav item (Share2 icon) under "Lainnya" group.
- `src/app/page.tsx`: Imported + rendered `<SharesSection />` when `section === "shares"`.

### 5. Bug Fix (incidental)
- `src/app/share/[token]/page.tsx` (line 104): Pre-existing TS error. `ShareLink` type requires `passwordHash` but the public share page strips it. Fixed by:
  - Explicitly setting `passwordHash: null` in `serializedLink` (security — never expose hash).
  - Casting `accessLevel` + `scopeType` from Prisma's `string` to union types.

## Verification

- `bun run lint` → **0 errors, 0 warnings** (exit 0).
- `npx tsc --noEmit --skipLibCheck` → **0 errors** in any of my touched files (shares-section.tsx, hooks.ts, api.ts, app-shell.tsx, page.tsx, share/[token]/page.tsx).
- Pre-existing TS errors in crypto.ts, transaction-form.tsx, audit-section.tsx, share-page-client.tsx remain untouched (out of scope).
- Dev server runs cleanly (existing routes return 200 OK).

## Files Touched

| File | Action |
|---|---|
| `src/components/finance/shares-section.tsx` | NEW (~1900 LOC) |
| `src/lib/api.ts` | +6 share methods |
| `src/lib/hooks.ts` | +6 share hooks + shares queryKey |
| `src/components/layout/app-shell.tsx` | +shares SectionId + nav item |
| `src/app/page.tsx` | +import + render `<SharesSection />` |
| `src/app/share/[token]/page.tsx` | TS fix (passwordHash null + enum cast) |
| `worklog.md` | +SH-SEC section |
