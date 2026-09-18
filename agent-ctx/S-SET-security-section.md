# Task S-SET — Security Settings Section

**Agent:** security-section-builder
**Date:** 2026-09-18
**Task ID:** S-SET
**Scope:** Build comprehensive security settings UI for "DompetKu" finance app

## Context

Read prior worklog (Tasks 1-9, S-API, S-LOCK, T-ALL) and the existing `src/components/finance/settings-section.tsx` to align with established patterns (emerald theme, Indonesian copy, shadcn/ui New York style, Lucide icons, `cn()`, sonner toasts).

## Infrastructure available

- `@/lib/security-defaults` → `SecurityConfig`, `DEFAULT_SECURITY_CONFIG`, `parseSecurityConfig`, `serializeSecurityConfig`, `SECURITY_KEYS`
- `@/lib/hooks` → `useSecuritySettings`, `useUpdateSecurityBulk`, `useBiometricList`, `useRegisterBiometric`, `useDeleteBiometric`, `useTrustedDevices`, `useRevokeTrustedDevice`, `usePanicWipe`, `useAuditLog`, `useCategories`, `useAccounts`
- `@/lib/crypto` → `hashSecret`, `generateRecoveryPhrase`, `validateRecoveryPhrase`, `getDeviceFingerprint`
- `@/lib/audit` → `auditLog`, `AUDIT_ACTIONS`
- `@/lib/security-store` → `useSecurityStore` (zustand+persist, `setSecrets({pinHash, passwordHash, duressPinHash})`)
- `@/lib/format` → `formatDateLong`

## Files created / modified

### Created
- `/home/z/my-project/src/components/finance/security-section.tsx` (~2460 LOC, single "use client" file, named + default export `SecuritySection`)

### Modified
- `/home/z/my-project/src/components/finance/settings-section.tsx`
  - Added `import { SecuritySection } from "@/components/finance/security-section";`
  - Replaced `<KeamananSection settings={settings} />` (basic 4-digit PIN + hide amounts) with `<SecuritySection />` (comprehensive A-L security config that drives `LockScreen` via the proper SecuritySetting table)

## Architecture

### Main component (`SecuritySection`)

- Fetches config via `useSecuritySettings()` (returns `Record<string,string>` from `/api/security` GET merged with defaults)
- Parses via `parseSecurityConfig(rawConfig)` → `SecurityConfig`
- Local state `localConfig: SecurityConfig` synced from server **only on initial load** (`hasInitializedRef`) to avoid overwriting unsaved local edits when the bulk-save mutation triggers a query refetch
- Debounced bulk save via `useEffect([localConfig, bulkMut])` with 500ms timeout → `bulkMut.mutate(serializeSecurityConfig(localConfig))`
- On success → `toast.success("Pengaturan disimpan")`; on error → `toast.error("Gagal menyimpan pengaturan")`
- `updateConfig(partial)` callback merges `setLocalConfig((prev) => ({ ...prev, ...partial }))`
- Loading state: 6 stacked `Skeleton h-40` cards while `isLoading`

### Layout helpers

- `SectionCard({icon, title, description, children, tone?})` — emerald primary tint icon by default, rose-tinted icon when `tone="danger"` (red border + ring for Emergency section)
- `SettingRow({icon?, title, description, children?})` — flex layout, label + description on left, control on right (Switch/Select/Input/Slider/Button)
- `SubHeader` — uppercase muted divider for grouping rows within a section (e.g., "Metode Kunci" / "Auto-Lock" / "Anti-Snooping")
- `InfoNote` — amber-tinted callout with `AlertTriangle` icon for warnings/notes

### Sections implemented (all 12 A-L)

**A. Kunci Aplikasi (App Lock)**
- PIN Lock Switch → opens `PinSetupDialog` (4-6 digit, input twice, validate match + length, `hashSecret(pin)` → `setSecrets({pinHash})` + `updateConfig({pinEnabled:true})` + audit `PIN_CHANGE`)
- Password Master Switch → opens `PasswordSetupDialog` (8+ char, show/hide toggle, **strength meter** with 4-segment colored bar: rose→amber→emerald, labels "Sangat Lemah/Lemah/Sedang/Kuat/Sangat Kuat" based on length + lowercase+uppercase + digit+symbol scoring)
- Pattern Lock Switch → informational toggle, no setup ("fitur pattern akan aktif")
- Biometric Switch + **WebAuthn registration** via `navigator.credentials.create()` with `authenticatorAttachment:"platform"`, `userVerification:"required"`, ES256 + RS256 algos; registers with name `"Device Fingerprint YYYY-MM-DD"`; auto-enables biometric toggle on success; lists registered credentials with delete buttons; checks `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` first
- Auto-Lock Switch + **Slider** (1-60 min, default 5) shown conditionally
- Lock on Tab Switch Switch
- Lock on App Close Switch

**B. Rate Limit & Brute Force**
- Max Attempts Select (3/5/10, default 5)
- Lockout Duration Select (1/5/15/30 min, default 5)
- Exponential Backoff Switch
- Wipe After N Failed Select (0=disabled/5/10/20, default 0) — `InfoNote` warning when >0

**C. Re-Authentication**
- Re-auth for Delete Transaction / Export / Settings Change / Account Delete — all Switches

**D. Privasi & Anti-Snooping**
- Hidden Amounts Switch (Rp••••)
- Hide Sensitive Categories Switch → conditional `HiddenCategoriesRow` with `MultiSelectPopover` (Popover + Checkbox list inside ScrollArea, color dot per item, "N dipilih" trigger)
- Hide Specific Accounts Switch (local `hideAccountsEnabled` UI state, defaults from `hiddenAccountIds !== ""`, clears config on disable) → conditional `HiddenAccountsRow` with same `MultiSelectPopover`
- Blur on Background / Blur on Minimize / Prevent Screen Capture / Disable Text Selection — Switches
- Clear Clipboard After Select (0/10/30/60 sec)
- Watermark Switch + conditional text Input (max 60 chars)
- Panic Gesture (5x logo click) Switch

**E. Decoy & Duress**
- Decoy Mode Switch + `InfoNote` explaining decoy behavior
- Set Duress PIN button → opens `PinSetupDialog` (reused), `hashSecret(pin)` → `setSecrets({duressPinHash})` + `updateConfig({duressPinHash, decoyEnabled:true})` + audit `PIN_CHANGE` "PIN duress dibuat"
- Panic Wipe Switch

**F. Session**
- Session Expiry Select (0=never/15/30/60/120 min, default 60)
- Single Device Session Switch
- Remember Device Select (0/7/30/90 days) — trusted device bypass

**G. Trusted Devices (list)**
- `useTrustedDevices()` query (returns active devices where `trustedUntil > now`)
- Each row: name, lastSeen ("Aktif terakhir: X menit lalu"), trustedUntil formatted via `formatDateLong`, Aktif/Kedaluwarsa Badge, revoke Trash button
- "Cabut Semua" button → `AlertDialog` confirm → loops `revokeMut.mutateAsync(d.id)` for all + audit `TRUSTED_DEVICE_ADD` per device
- Empty state when no devices

**H. Network Security** (informational)
- Local-Only Mode Switch (saved but enforcement requires restart/env)
- IP Whitelist text Input (comma-separated CIDR/IPs)
- Block Tor Switch
- `InfoNote`: "Pengaturan jaringan diterapkan via environment variables / middleware"

**I. Encryption**
- Encrypt Database Switch — `disabled` (Coming soon, SQLCipher note via `InfoNote`)
- Encrypt Backups Switch
- Encrypt Exports Switch

**J. Backup & Recovery**
- Auto-Backup Switch + conditional Interval Select (7/14/30 days)
- Recovery Phrase Switch → on enable: `generateRecoveryPhrase()` (12 Indonesian words) → `RecoveryPhraseDialog` showing 12-word grid in amber-tinted box, rose-tinted warning "hanya ditampilkan sekali", copy button (`navigator.clipboard.writeText`), checkbox "Saya sudah mencatat", confirm button → `hashSecret(phrase)` + `updateConfig({recoveryPhraseEnabled:true})` + audit `PIN_CHANGE` "Recovery phrase dibuat"
- On disable: `updateConfig({recoveryPhraseEnabled:false})`
- `InfoNote` when enabled

**K. Audit Log**
- Enable Audit Log Switch
- Failed Attempt Alert Switch
- New Device Alert Switch
- "Lihat Audit Log" button → opens `AuditLogDialog` (max-w-3xl)
  - `useAuditLog({limit: 100, action: filter})` with action filter Select ("Semua Aksi" / 15 specific actions from `AUDIT_ACTIONS` mapped to Indonesian labels via `auditActionLabel()`)
  - Table: Aksi (Badge), Detail (line-clamp-2), IP / Sidik (ipAddress), Waktu (`formatTimeAgo()`), Status (Check emerald / AlertTriangle rose)
  - Sticky header, ScrollArea max-h-55vh, loading spinner when `isFetching`
  - Empty state row when no entries

**L. Emergency Actions (Danger Zone)**
- Red-bordered Card with `tone="danger"` (rose-500/40 border + ring)
- Panic Wipe button (variant="destructive") → opens Step 1 AlertDialog → "Lanjutkan" → opens Step 2 AlertDialog with text input requiring exact "HAPUS" → "Hapus Permanen" → `panicWipeMut.mutateAsync()` → toast success + `window.location.reload()` after 800ms
- "Hapus Semua Data" button → same flow (chained AlertDialogs: Step 1 confirm → Step 2 type "HAPUS")
- `InfoNote`: "Setelah wipe, halaman akan dimuat ulang otomatis"

## Key implementation details

### WebAuthn biometric registration

```ts
const challenge = new Uint8Array(32);
crypto.getRandomValues(challenge);
const userId = new TextEncoder().encode(`dompetku-user-${Date.now()}`);
const credential = await navigator.credentials.create({
  publicKey: {
    challenge,
    rp: { name: "DompetKu" },
    user: { id: userId, name: "user@dompetku", displayName: "DompetKu User" },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },    // ES256
      { type: "public-key", alg: -257 },   // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  },
}) as PublicKeyCredential | null;
const credentialId = bufferToBase64(credential.rawId);
const today = new Date().toISOString().slice(0, 10);
const name = `Device Fingerprint ${today}`;
await registerMut.mutateAsync({ name, credentialId, publicKey: credentialId, counter: 0 });
```

### Debounced bulk-save pattern

```ts
const hasInitializedRef = React.useRef(false);
const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

// Sync from server on FIRST load only (prevents overwrite of in-flight user edits
// after bulk-save triggers query refetch via qc.invalidateQueries)
React.useEffect(() => {
  if (rawConfig && !hasInitializedRef.current) {
    setLocalConfig(serverConfig);
    hasInitializedRef.current = true;
  }
}, [rawConfig, serverConfig]);

React.useEffect(() => {
  if (!hasInitializedRef.current) return;
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => {
    bulkMut.mutate(serializeSecurityConfig(localConfig), {
      onSuccess: () => toast.success("Pengaturan disimpan"),
      onError: () => toast.error("Gagal menyimpan pengaturan"),
    });
  }, 500);
  return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
}, [localConfig, bulkMut]);
```

### Password strength scoring

```ts
let score = 0;
if (pw.length >= 8) score++;
if (pw.length >= 12) score++;
if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
// 0-4 → rose, rose, amber, emerald, emerald-600
// labels: Sangat Lemah / Lemah / Sedang / Kuat / Sangat Kuat
```

## Conventions followed

- `"use client"` directive
- shadcn/ui (Badge, Button, Card, Checkbox, Dialog, AlertDialog, Input, Label, ScrollArea, Select, Separator, Skeleton, Slider, Switch, Table, Popover)
- Lucide icons (23 icons used: AlertTriangle, Eye, EyeOff, Fingerprint, History, KeyRound, Loader2, Lock, ShieldAlert, ShieldCheck, Smartphone, Trash2, Network, DatabaseBackup, FileLock2, Timer, BellRing, UserX, Server, Copy, Check, Plus, Power)
- `cn()` from `@/lib/utils`
- Indonesian throughout (labels, descriptions, toasts, button text, audit log action labels)
- Emerald theme preserved (primary tint for icons, emerald Check for success states); rose used for danger/destructive states only
- `toast` from `sonner` for all feedback
- `auditLog` + `AUDIT_ACTIONS` from `@/lib/audit` for security event logging (PIN_CHANGE, BIOMETRIC_REGISTER, TRUSTED_DEVICE_ADD)
- `hashSecret` (not `hashPin`) for all PIN/password hashing — proper SHA-256+salt via Web Crypto
- `formatDateLong` from `@/lib/format` for date display
- Mobile-first responsive: controls use `size="sm"` Select triggers, narrow widths (w-24/w-28/w-32/w-44/w-56), ScrollArea for long lists (max-h-40 for biometric, max-h-72 for trusted devices, max-h-55vh for audit log table)
- Accessibility: aria-label on all Switch/Button controls, semantic HTML, autoFocus on dialog inputs

## Verification

- `bun run lint` → **0 errors, 0 warnings** ✅
- `bunx tsc --noEmit --skipLibCheck` → **0 errors in security-section.tsx and settings-section.tsx** ✅ (pre-existing errors in dashboard/route.ts, crypto.ts, examples/websocket, skills/* remain untouched — out of scope for S-SET)
- Dev server (`bun run dev`) compiles cleanly — `✓ Compiled in Nms` entries in dev.log after each save, no errors

## Backward compatibility

- `SettingsSection` export unchanged — still default export from `settings-section.tsx`, still rendered by `page.tsx` for `section === "settings"`. Existing `AppShell` nav and `SectionId` type untouched.
- The removed `KeamananSection` (basic 4-digit PIN writing to `Setting` table via `useSettings`/`useUpdateSetting`) was effectively dead code — `LockScreen` (Task S-LOCK) reads `pinHash` from the zustand `useSecurityStore`, not from the `Setting` table. The new `SecuritySection` correctly writes `pinHash` via `setSecrets({pinHash})` to the zustand store AND `pinEnabled:true` to the `SecuritySetting` table, which `LockScreen` actually reads.
- The basic `hideAmounts` toggle (AppSettings) was replaced by `hiddenAmounts` (SecurityConfig) — both are unused by any consumer component yet, so no UI regression.
- `TampilanSection`, `PengingatSection`, `DataSection`, `TentangSection` all kept intact.
- The `hashPin` import in `settings-section.tsx` is still used by the orphaned `KeamananSection` definition (kept in file but no longer rendered). Could be removed in a future cleanup pass.

## Stage Summary

- New file: `src/components/finance/security-section.tsx` (~2460 LOC, single default + named export)
- 12 sections (A-L) all implemented per spec with proper Indonesian copy, emerald theme, danger-zone red border for Emergency
- Production-quality debounced bulk-save with 500ms debounce, local state synced from server on first load only
- WebAuthn biometric registration with platform authenticator + UV required
- Password strength meter with 4-tier scoring
- Recovery phrase with 12-word Indonesian mnemonic + write-down confirmation checkbox
- Audit log viewer with 100-entry table + action filter Select + Indonesian action labels
- Trusted devices list with revoke + revoke-all (AlertDialog confirm)
- Two-step AlertDialog confirmation for panic wipe (type "HAPUS" required)
- Page reload after wipe to fully reset client state
- Integrated into `SettingsSection` by replacing the basic `KeamananSection`
- Lint-clean, type-clean (for new code), zero regressions to existing dev server
