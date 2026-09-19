"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Network,
  DatabaseBackup,
  FileLock2,
  Timer,
  BellRing,
  UserX,
  Server,
  Copy,
  Check,
  Plus,
  Power,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import {
  useAccounts,
  useAuditLog,
  useBiometricList,
  useCategories,
  useDeleteBiometric,
  usePanicWipe,
  useRegisterBiometric,
  useRevokeTrustedDevice,
  useSecuritySettings,
  useTrustedDevices,
  useUpdateSecurityBulk,
} from "@/lib/hooks";
import {
  DEFAULT_SECURITY_CONFIG,
  parseSecurityConfig,
  serializeSecurityConfig,
  type SecurityConfig,
} from "@/lib/security-defaults";
import {
  AUDIT_ACTIONS,
  auditLog,
} from "@/lib/audit";
import {
  generateRecoveryPhrase,
  hashSecret,
  validateRecoveryPhrase,
} from "@/lib/crypto";
import { useSecurityStore } from "@/lib/security-store";
import { formatDateLong } from "@/lib/format";

// ============================================================
// Helpers
// ============================================================

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function passwordStrength(
  pw: string,
): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "Kosong", color: "bg-muted" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
  const labels = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat"];
  const colors = [
    "bg-rose-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: labels[score],
    color: colors[score],
  };
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDateLong(iso);
}

function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    [AUDIT_ACTIONS.LOGIN_SUCCESS]: "Login Berhasil",
    [AUDIT_ACTIONS.LOGIN_FAILED]: "Login Gagal",
    [AUDIT_ACTIONS.LOGOUT]: "Logout",
    [AUDIT_ACTIONS.LOCK]: "Kunci",
    [AUDIT_ACTIONS.UNLOCK]: "Buka Kunci",
    [AUDIT_ACTIONS.PIN_CHANGE]: "Ubah PIN",
    [AUDIT_ACTIONS.EXPORT]: "Ekspor",
    [AUDIT_ACTIONS.IMPORT]: "Impor",
    [AUDIT_ACTIONS.DELETE_TX]: "Hapus Transaksi",
    [AUDIT_ACTIONS.DELETE_ACCOUNT]: "Hapus Akun",
    [AUDIT_ACTIONS.SETTING_CHANGE]: "Ubah Pengaturan",
    [AUDIT_ACTIONS.PANIC_WIPE]: "Panic Wipe",
    [AUDIT_ACTIONS.DECOY_ACCESS]: "Akses Decoy",
    [AUDIT_ACTIONS.BIOMETRIC_REGISTER]: "Daftar Biometrik",
    [AUDIT_ACTIONS.BIOMETRIC_LOGIN]: "Login Biometrik",
    [AUDIT_ACTIONS.RATE_LIMIT_HIT]: "Rate Limit",
    [AUDIT_ACTIONS.TRUSTED_DEVICE_ADD]: "Perangkat Terpercaya",
    [AUDIT_ACTIONS.BACKUP_CREATE]: "Backup",
    [AUDIT_ACTIONS.RESTORE]: "Restore",
  };
  return map[action] ?? action;
}

// ============================================================
// Layout components
// ============================================================

function SectionCard({
  icon,
  title,
  description,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Card
      className={cn(
        "p-5",
        tone === "danger" && "border-rose-500/40 ring-1 ring-rose-500/10",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tone === "danger"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </Card>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {children}
      </p>
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      <span>{children}</span>
    </div>
  );
}

// ============================================================
// Main SecuritySection
// ============================================================

export function SecuritySection() {
  const { data: rawConfig, isLoading } = useSecuritySettings();
  const bulkMut = useUpdateSecurityBulk();

  const serverConfig = React.useMemo(
    () => (rawConfig ? parseSecurityConfig(rawConfig) : DEFAULT_SECURITY_CONFIG),
    [rawConfig],
  );

  const [localConfig, setLocalConfig] =
    React.useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  // Sync from server only on initial load to avoid overwriting unsaved local
  // edits after a bulk save triggers a query refetch.
  const hasInitializedRef = React.useRef(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutateRef = React.useRef(bulkMut.mutate);
  React.useEffect(() => {
    mutateRef.current = bulkMut.mutate;
  }, [bulkMut.mutate]);
  const retryCountRef = React.useRef(0);

  // Sync from server on first load (and when raw data first arrives)
  React.useEffect(() => {
    if (rawConfig && !hasInitializedRef.current) {
      setLocalConfig(serverConfig);
      hasInitializedRef.current = true;
    }
  }, [rawConfig, serverConfig]);

  // Debounced bulk save (skipped until first server sync completes)
  React.useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      mutateRef.current(serializeSecurityConfig(localConfig), {
        onSuccess: () => {
          retryCountRef.current = 0;
          toast.success("Pengaturan disimpan");
        },
        onError: (err) => {
          // Retry up to 3 times with backoff for transient failures
          if (retryCountRef.current < 3) {
            retryCountRef.current += 1;
            const delay = 1000 * retryCountRef.current;
            setTimeout(() => {
              mutateRef.current(serializeSecurityConfig(localConfig), {
                onSuccess: () => {
                  retryCountRef.current = 0;
                  toast.success("Pengaturan disimpan");
                },
                onError: () => {
                  if (retryCountRef.current >= 3) {
                    toast.error("Gagal menyimpan — server tidak tersambung");
                  }
                },
              });
            }, delay);
          } else {
            toast.error("Gagal menyimpan — server tidak tersambung");
          }
        },
      });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [localConfig]);

  const updateConfig = React.useCallback(
    (partial: Partial<SecurityConfig>) => {
      setLocalConfig((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Keamanan</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Konfigurasi perlindungan data keuangan Anda. Perubahan disimpan otomatis.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <AppLockSection config={localConfig} updateConfig={updateConfig} />
          <RateLimitSection config={localConfig} updateConfig={updateConfig} />
          <ReauthSection config={localConfig} updateConfig={updateConfig} />
          <PrivacySection config={localConfig} updateConfig={updateConfig} />
          <DecoySection config={localConfig} updateConfig={updateConfig} />
          <SessionSection config={localConfig} updateConfig={updateConfig} />
          <TrustedDevicesSection />
          <NetworkSection config={localConfig} updateConfig={updateConfig} />
          <EncryptionSection config={localConfig} updateConfig={updateConfig} />
          <BackupSection config={localConfig} updateConfig={updateConfig} />
          <AuditLogSection config={localConfig} updateConfig={updateConfig} />
          <EmergencySection />
        </div>
      )}
    </div>
  );
}

// ============================================================
// A. Kunci Aplikasi (App Lock)
// ============================================================

function AppLockSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  const setSecrets = useSecurityStore((s) => s.setSecrets);
  const [pinDialog, setPinDialog] = React.useState(false);
  const [passwordDialog, setPasswordDialog] = React.useState(false);

  function handlePinToggle(enabled: boolean) {
    if (enabled) {
      setPinDialog(true);
    } else {
      updateConfig({ pinEnabled: false, pinHash: "" });
      setSecrets({ pinHash: null });
      // Clear from server too
      bulkMut.mutate({ ...serializeSecurityConfig(localConfig), pinEnabled: "false", pinHash: "" });
      auditLog(AUDIT_ACTIONS.PIN_CHANGE, "PIN dinonaktifkan", true);
      toast.success("PIN dinonaktifkan");
    }
  }

  function handlePasswordToggle(enabled: boolean) {
    if (enabled) {
      setPasswordDialog(true);
    } else {
      updateConfig({ passwordEnabled: false, passwordHash: "" });
      setSecrets({ passwordHash: null });
      bulkMut.mutate({ ...serializeSecurityConfig(localConfig), passwordEnabled: "false", passwordHash: "" });
      toast.success("Password Master dinonaktifkan");
    }
  }

  async function handlePatternToggle(enabled: boolean) {
    updateConfig({ patternEnabled: enabled });
    toast.success(
      enabled
        ? "Pola aktif. Fitur pattern lock akan aktif."
        : "Pattern lock dinonaktifkan.",
    );
  }

  return (
    <SectionCard
      icon={<Lock className="h-4 w-4" />}
      title="Kunci Aplikasi"
      description="Metode pembukaan kunci dan perilaku auto-lock."
    >
      <SubHeader>Metode Kunci</SubHeader>

      <SettingRow
        icon={<KeyRound className="h-4 w-4" />}
        title="PIN Lock"
        description="Buka kunci dengan PIN 4-6 digit."
      >
        <Switch
          checked={config.pinEnabled}
          onCheckedChange={handlePinToggle}
          aria-label="Aktifkan PIN"
        />
      </SettingRow>

      <SettingRow
        icon={<Lock className="h-4 w-4" />}
        title="Password Master"
        description="Password panjang sebagai cadangan. Minimal 8 karakter."
      >
        <Switch
          checked={config.passwordEnabled}
          onCheckedChange={handlePasswordToggle}
          aria-label="Aktifkan Password Master"
        />
      </SettingRow>

      <SettingRow
        icon={<EyeOff className="h-4 w-4" />}
        title="Pattern Lock"
        description="Buka kunci dengan pola titik 3×3."
      >
        <Switch
          checked={config.patternEnabled}
          onCheckedChange={handlePatternToggle}
          aria-label="Aktifkan Pattern Lock"
        />
      </SettingRow>

      <BiometricRow
        enabled={config.biometricEnabled}
        onToggle={(v) => updateConfig({ biometricEnabled: v })}
      />

      <SubHeader>Auto-Lock</SubHeader>

      <SettingRow
        icon={<Timer className="h-4 w-4" />}
        title="Auto-Lock"
        description="Kunci otomatis saat idle."
      >
        <Switch
          checked={config.autoLockEnabled}
          onCheckedChange={(v) => updateConfig({ autoLockEnabled: v })}
          aria-label="Aktifkan Auto-Lock"
        />
      </SettingRow>

      {config.autoLockEnabled && (
        <SettingRow
          title="Waktu Auto-Lock"
          description={`Kunci setelah ${config.autoLockMinutes} menit tidak aktif.`}
        >
          <div className="flex w-44 items-center gap-3">
            <Slider
              value={[config.autoLockMinutes]}
              min={1}
              max={60}
              step={1}
              onValueChange={(v) =>
                updateConfig({ autoLockMinutes: v[0] ?? 5 })
              }
              aria-label="Menit auto-lock"
            />
            <span className="w-12 text-right text-xs font-medium tabular-nums text-muted-foreground">
              {config.autoLockMinutes}m
            </span>
          </div>
        </SettingRow>
      )}

      <SettingRow
        title="Lock saat Ganti Tab"
        description="Kunci saat pengguna beralih ke tab lain."
      >
        <Switch
          checked={config.lockOnTabSwitch}
          onCheckedChange={(v) => updateConfig({ lockOnTabSwitch: v })}
          aria-label="Lock saat ganti tab"
        />
      </SettingRow>

      <SettingRow
        title="Lock saat App Ditutup"
        description="Kunci saat aplikasi ditutup atau refresh."
      >
        <Switch
          checked={config.lockOnAppClose}
          onCheckedChange={(v) => updateConfig({ lockOnAppClose: v })}
          aria-label="Lock saat app ditutup"
        />
      </SettingRow>

      <PinSetupDialog
        open={pinDialog}
        onOpenChange={setPinDialog}
        onConfirm={async (pin) => {
          try {
            const hash = await hashSecret(pin);
            setSecrets({ pinHash: hash });
            // Save to server so it syncs across all devices
            bulkMut.mutate(
              { ...serializeSecurityConfig(localConfig), pinEnabled: "true", pinHash: hash },
              {
                onSuccess: () => toast.success("PIN aktif & tersinkron ke semua device."),
                onError: () => toast.error("PIN aktif lokal, tapi gagal sync ke server."),
              }
            );
            updateConfig({ pinEnabled: true });
            auditLog(AUDIT_ACTIONS.PIN_CHANGE, "PIN baru dibuat", true);
            setPinDialog(false);
          } catch {
            toast.error("Gagal meng-hash PIN.");
          }
        }}
      />

      <PasswordSetupDialog
        open={passwordDialog}
        onOpenChange={setPasswordDialog}
        onConfirm={async (pw) => {
          try {
            const hash = await hashSecret(pw);
            setSecrets({ passwordHash: hash });
            // Save to server for cross-device sync
            bulkMut.mutate(
              { ...serializeSecurityConfig(localConfig), passwordEnabled: "true", passwordHash: hash },
              {
                onSuccess: () => toast.success("Password Master aktif & tersinkron."),
                onError: () => toast.error("Password aktif lokal, tapi gagal sync."),
              }
            );
            updateConfig({ passwordEnabled: true });
            auditLog(AUDIT_ACTIONS.PIN_CHANGE, "Password Master dibuat", true);
            toast.success("Password Master aktif.");
            setPasswordDialog(false);
          } catch {
            toast.error("Gagal meng-hash password.");
          }
        }}
      />
    </SectionCard>
  );
}

// ---- PIN setup dialog ----

function PinSetupDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (pin: string) => void | Promise<void>;
}) {
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPin("");
      setConfirm("");
      setSubmitting(false);
    }
  }, [open]);

  const validLength = pin.length >= 4 && pin.length <= 6;
  const allDigits = /^\d*$/.test(pin) && pin.length > 0;
  const match = pin.length > 0 && pin === confirm;

  async function handleSubmit() {
    if (!validLength || !allDigits || !match) return;
    setSubmitting(true);
    try {
      await onConfirm(pin);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Buat PIN</DialogTitle>
          <DialogDescription>
            PIN 4-6 digit. Ingat baik-baik — tidak bisa dipulihkan jika lupa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pin-input">PIN</Label>
            <Input
              id="pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4-6 digit"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin-confirm">Konfirmasi PIN</Label>
            <Input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={confirm}
              maxLength={6}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="Ulangi PIN"
            />
          </div>

          {pin.length > 0 && !validLength && (
            <p className="text-xs text-rose-500">PIN harus 4-6 digit.</p>
          )}
          {confirm.length > 0 && !match && (
            <p className="text-xs text-rose-500">PIN tidak cocok.</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Batal</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!validLength || !match || submitting}
            className="gap-1.5"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Password setup dialog ----

function PasswordSetupDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (pw: string) => void | Promise<void>;
}) {
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPw("");
      setConfirm("");
      setShow(false);
      setSubmitting(false);
    }
  }, [open]);

  const strength = passwordStrength(pw);
  const longEnough = pw.length >= 8;
  const match = pw.length > 0 && pw === confirm;

  async function handleSubmit() {
    if (!longEnough || !match) return;
    setSubmitting(true);
    try {
      await onConfirm(pw);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Buat Password Master</DialogTitle>
          <DialogDescription>
            Minimal 8 karakter. Disimpan terenkripsi di perangkat ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pw-input">Password</Label>
            <div className="relative">
              <Input
                id="pw-input"
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Min. 8 karakter"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Sembunyikan" : "Tampilkan"}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {pw.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex h-1.5 flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        i < strength.score ? strength.color : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <span className="w-24 text-right text-[11px] font-medium text-muted-foreground">
                  {strength.label}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Konfirmasi Password</Label>
            <Input
              id="pw-confirm"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ulangi password"
              autoComplete="new-password"
            />
          </div>
          {!longEnough && pw.length > 0 && (
            <p className="text-xs text-rose-500">
              Password minimal 8 karakter.
            </p>
          )}
          {confirm.length > 0 && !match && (
            <p className="text-xs text-rose-500">Password tidak cocok.</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Batal</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!longEnough || !match || submitting}
            className="gap-1.5"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Biometric row + dialog ----

function BiometricRow({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  const biometricList = useBiometricList();
  const registerMut = useRegisterBiometric();
  const deleteMut = useDeleteBiometric();
  const [registering, setRegistering] = React.useState(false);

  async function handleRegister() {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast.error("Browser tidak mendukung WebAuthn.");
      return;
    }
    try {
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error("Tidak ada autentikator biometrik pada perangkat ini.");
        return;
      }
    } catch {
      toast.error("Gagal memeriksa dukungan biometrik.");
      return;
    }

    setRegistering(true);
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(
        `dompetku-user-${Date.now()}`,
      );

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "DompetKu" },
          user: {
            id: userId,
            name: "user@dompetku",
            displayName: "DompetKu User",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60_000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        toast.error("Pendaftaran biometrik dibatalkan.");
        return;
      }

      const credentialId = bufferToBase64(credential.rawId);
      const today = new Date().toISOString().slice(0, 10);
      const name = `Device Fingerprint ${today}`;

      await registerMut.mutateAsync({
        name,
        credentialId,
        publicKey: credentialId,
        counter: 0,
      });
      auditLog(
        AUDIT_ACTIONS.BIOMETRIC_REGISTER,
        `Mendaftarkan biometrik: ${name}`,
        true,
      );
      toast.success("Biometrik berhasil didaftarkan.");
      if (!enabled) onToggle(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("cancel") || msg.includes("Abort")) {
        toast.error("Pendaftaran dibatalkan.");
      } else {
        toast.error("Gagal mendaftarkan biometrik.");
      }
    } finally {
      setRegistering(false);
    }
  }

  function handleDelete(id: string, name: string) {
    deleteMut.mutate(id, {
      onSuccess: () => {
        auditLog(
          AUDIT_ACTIONS.BIOMETRIC_REGISTER,
          `Menghapus biometrik: ${name}`,
          true,
        );
        toast.success("Biometrik dihapus.");
      },
      onError: () => toast.error("Gagal menghapus biometrik."),
    });
  }

  const items = biometricList.data ?? [];

  return (
    <>
      <SettingRow
        icon={<Fingerprint className="h-4 w-4" />}
        title="Biometrik"
        description="Buka kunci dengan sidik jari / wajah via WebAuthn."
      >
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Aktifkan biometrik"
        />
      </SettingRow>

      {enabled && (
        <div className="py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Kredensial Terdaftar
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegister}
              disabled={registering}
              className="gap-1.5"
            >
              {registering ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Daftarkan
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Belum ada kredensial biometrik terdaftar.
            </p>
          ) : (
            <div className="max-h-40 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
              {items.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTimeAgo(b.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                    onClick={() => handleDelete(b.id, b.name)}
                    disabled={deleteMut.isPending}
                    aria-label={`Hapus ${b.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ============================================================
// B. Rate Limit & Brute Force Protection
// ============================================================

function RateLimitSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  return (
    <SectionCard
      icon={<ShieldAlert className="h-4 w-4" />}
      title="Rate Limit & Brute Force"
      description="Proteksi percobaan pembukaan kunci yang berulang."
    >
      <SettingRow
        title="Maksimal Percobaan"
        description="Jumlah percobaan gagal sebelum lockout."
      >
        <Select
          value={String(config.rateLimitMaxAttempts)}
          onValueChange={(v) =>
            updateConfig({ rateLimitMaxAttempts: Number(v) })
          }
        >
          <SelectTrigger size="sm" className="w-24" aria-label="Maksimal percobaan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 kali</SelectItem>
            <SelectItem value="5">5 kali</SelectItem>
            <SelectItem value="10">10 kali</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        title="Durasi Lockout"
        description="Berapa lama akun terkunci setelah maksimal percobaan."
      >
        <Select
          value={String(config.rateLockoutMinutes)}
          onValueChange={(v) =>
            updateConfig({ rateLockoutMinutes: Number(v) })
          }
        >
          <SelectTrigger size="sm" className="w-28" aria-label="Durasi lockout">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 menit</SelectItem>
            <SelectItem value="5">5 menit</SelectItem>
            <SelectItem value="15">15 menit</SelectItem>
            <SelectItem value="30">30 menit</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        title="Exponential Backoff"
        description="Durasi lockout meningkat setiap kelompok percobaan gagal."
      >
        <Switch
          checked={config.exponentialBackoff}
          onCheckedChange={(v) => updateConfig({ exponentialBackoff: v })}
          aria-label="Exponential backoff"
        />
      </SettingRow>

      <SettingRow
        title="Wipe Setelah Percobaan Gagal"
        description="Hapus semua data setelah N percobaan gagal. 0 = nonaktif."
      >
        <Select
          value={String(config.wipeAfterFailedAttempts)}
          onValueChange={(v) =>
            updateConfig({ wipeAfterFailedAttempts: Number(v) })
          }
        >
          <SelectTrigger
            size="sm"
            className="w-32"
            aria-label="Wipe setelah percobaan gagal"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Nonaktif</SelectItem>
            <SelectItem value="5">5 kali</SelectItem>
            <SelectItem value="10">10 kali</SelectItem>
            <SelectItem value="20">20 kali</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      {config.wipeAfterFailedAttempts > 0 && (
        <InfoNote>
          <strong>Peringatan:</strong> Setelah {config.wipeAfterFailedAttempts}{" "}
          kali percobaan gagal, SEMUA data keuangan Anda akan dihapus permanen
          tanpa bisa dikembalikan. Aktifkan hanya jika Anda benar-benar
          membutuhkan proteksi ekstrem.
        </InfoNote>
      )}
    </SectionCard>
  );
}

// ============================================================
// C. Re-Authentication
// ============================================================

function ReauthSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  return (
    <SectionCard
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Re-Authentication"
      description="Minta PIN/password untuk aksi sensitif."
    >
      <SettingRow
        title="Hapus Transaksi"
        description="Minta re-auth saat menghapus transaksi."
      >
        <Switch
          checked={config.reauthForDelete}
          onCheckedChange={(v) => updateConfig({ reauthForDelete: v })}
          aria-label="Re-auth hapus transaksi"
        />
      </SettingRow>

      <SettingRow
        title="Ekspor Data"
        description="Minta re-auth saat mengekspor data."
      >
        <Switch
          checked={config.reauthForExport}
          onCheckedChange={(v) => updateConfig({ reauthForExport: v })}
          aria-label="Re-auth ekspor"
        />
      </SettingRow>

      <SettingRow
        title="Ubah Pengaturan"
        description="Minta re-auth saat mengubah pengaturan keamanan."
      >
        <Switch
          checked={config.reauthForSettings}
          onCheckedChange={(v) => updateConfig({ reauthForSettings: v })}
          aria-label="Re-auth pengaturan"
        />
      </SettingRow>

      <SettingRow
        title="Hapus Akun"
        description="Minta re-auth saat menghapus akun."
      >
        <Switch
          checked={config.reauthForAccountDelete}
          onCheckedChange={(v) => updateConfig({ reauthForAccountDelete: v })}
          aria-label="Re-auth hapus akun"
        />
      </SettingRow>
    </SectionCard>
  );
}

// ============================================================
// D. Privasi & Anti-Snooping
// ============================================================

function PrivacySection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  // Local UI state for "Hide Specific Accounts" toggle, derived from whether
  // any accounts are currently hidden but tracked separately so toggling ON
  // reveals the multi-select before any account is picked.
  const [hideAccountsEnabled, setHideAccountsEnabled] = React.useState(
    config.hiddenAccountIds !== "",
  );

  function handleToggleHideAccounts(v: boolean) {
    setHideAccountsEnabled(v);
    if (!v) updateConfig({ hiddenAccountIds: "" });
  }

  return (
    <SectionCard
      icon={<EyeOff className="h-4 w-4" />}
      title="Privasi & Anti-Snooping"
      description="Sembunyikan informasi sensitif dari pengintaian."
    >
      <SettingRow
        icon={<EyeOff className="h-4 w-4" />}
        title="Sembunyikan Nominal"
        description="Tampilkan Rp•••• alih-alih nominal."
      >
        <Switch
          checked={config.hiddenAmounts}
          onCheckedChange={(v) => updateConfig({ hiddenAmounts: v })}
          aria-label="Sembunyikan nominal"
        />
      </SettingRow>

      <SettingRow
        title="Sembunyikan Kategori Sensitif"
        description="Pilih kategori yang ingin disembunyikan."
      >
        <Switch
          checked={config.hideSensitiveCategories}
          onCheckedChange={(v) =>
            updateConfig({ hideSensitiveCategories: v })
          }
          aria-label="Sembunyikan kategori sensitif"
        />
      </SettingRow>

      {config.hideSensitiveCategories && (
        <HiddenCategoriesRow
          value={config.hiddenCategoryIds}
          onChange={(v) => updateConfig({ hiddenCategoryIds: v })}
        />
      )}

      <SettingRow
        title="Sembunyikan Akun Tertentu"
        description="Pilih akun yang ingin disembunyikan."
      >
        <Switch
          checked={hideAccountsEnabled}
          onCheckedChange={handleToggleHideAccounts}
          aria-label="Sembunyikan akun tertentu"
        />
      </SettingRow>

      {hideAccountsEnabled && (
        <HiddenAccountsRow
          value={config.hiddenAccountIds}
          onChange={(v) => updateConfig({ hiddenAccountIds: v })}
        />
      )}

      <SubHeader>Anti-Snooping</SubHeader>

      <SettingRow
        title="Blur saat Hilang Fokus"
        description="Kaburkan layar saat tab kehilangan fokus."
      >
        <Switch
          checked={config.blurOnBackground}
          onCheckedChange={(v) => updateConfig({ blurOnBackground: v })}
          aria-label="Blur saat hilang fokus"
        />
      </SettingRow>

      <SettingRow
        title="Blur saat Minimize"
        description="Kaburkan layar saat aplikasi di-minimize."
      >
        <Switch
          checked={config.blurOnMinimize}
          onCheckedChange={(v) => updateConfig({ blurOnMinimize: v })}
          aria-label="Blur saat minimize"
        />
      </SettingRow>

      <SettingRow
        title="Cegah Screenshot"
        description="Blokir pengambilan screenshot layar (jika didukung)."
      >
        <Switch
          checked={config.preventScreenCapture}
          onCheckedChange={(v) => updateConfig({ preventScreenCapture: v })}
          aria-label="Cegah screenshot"
        />
      </SettingRow>

      <SettingRow
        title="Clear Clipboard"
        description="Hapus isi clipboard yang berisi data sensitif."
      >
        <Select
          value={String(config.clearClipboardSeconds)}
          onValueChange={(v) =>
            updateConfig({ clearClipboardSeconds: Number(v) })
          }
        >
          <SelectTrigger size="sm" className="w-32" aria-label="Clear clipboard">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Nonaktif</SelectItem>
            <SelectItem value="10">10 detik</SelectItem>
            <SelectItem value="30">30 detik</SelectItem>
            <SelectItem value="60">60 detik</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        title="Nonaktifkan Seleksi Teks"
        description="Cegah copy-paste teks dari aplikasi."
      >
        <Switch
          checked={config.disableTextSelection}
          onCheckedChange={(v) => updateConfig({ disableTextSelection: v })}
          aria-label="Nonaktifkan seleksi teks"
        />
      </SettingRow>

      <SettingRow
        title="Watermark"
        description="Tampilkan watermark samar di seluruh aplikasi."
      >
        <Switch
          checked={config.watermarkEnabled}
          onCheckedChange={(v) => updateConfig({ watermarkEnabled: v })}
          aria-label="Aktifkan watermark"
        />
      </SettingRow>

      {config.watermarkEnabled && (
        <SettingRow title="Teks Watermark" description="Teks yang ditampilkan.">
          <Input
            value={config.watermarkText}
            onChange={(e) => updateConfig({ watermarkText: e.target.value })}
            placeholder="Pribadi"
            className="h-8 w-44"
            maxLength={60}
          />
        </SettingRow>
      )}

      <SettingRow
        title="Panic Gesture"
        description="Ketuk logo 5 kali cepat untuk memicu aksi panic."
      >
        <Switch
          checked={config.panicGestureEnabled}
          onCheckedChange={(v) => updateConfig({ panicGestureEnabled: v })}
          aria-label="Panic gesture"
        />
      </SettingRow>
    </SectionCard>
  );
}

// ---- Multi-select Popover (shared) ----

function MultiSelectPopover({
  type,
  value,
  onChange,
}: {
  type: "category" | "account";
  value: string;
  onChange: (v: string) => void;
}) {
  const cats = useCategories();
  const accs = useAccounts();

  const items = React.useMemo(() => {
    if (type === "category") {
      return (cats.data ?? []).map((c) => ({
        id: c.id,
        label: c.name,
        color: c.color,
      }));
    }
    return (accs.data ?? []).map((a) => ({
      id: a.id,
      label: a.name,
      color: a.color,
    }));
  }, [type, cats.data, accs.data]);

  const selected = React.useMemo(
    () => (value ? value.split(",").filter(Boolean) : []),
    [value],
  );

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next.join(","));
  }

  const triggerLabel =
    selected.length === 0
      ? "Pilih…"
      : `${selected.length} dipilih`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Check className="h-3.5 w-3.5 text-primary" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <ScrollArea className="h-64">
          <div className="space-y-0.5 p-2">
            {items.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Tidak ada item.
              </p>
            )}
            {items.map((item) => {
              const checked = selected.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted",
                    checked && "bg-muted",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function HiddenCategoriesRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <SettingRow
      title="Daftar Kategori"
      description="Pilih kategori yang ingin disembunyikan dari tampilan."
    >
      <MultiSelectPopover type="category" value={value} onChange={onChange} />
    </SettingRow>
  );
}

function HiddenAccountsRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <SettingRow
      title="Daftar Akun"
      description="Pilih akun yang ingin disembunyikan dari tampilan."
    >
      <MultiSelectPopover type="account" value={value} onChange={onChange} />
    </SettingRow>
  );
}

// ============================================================
// E. Decoy & Duress
// ============================================================

function DecoySection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  const setSecrets = useSecurityStore((s) => s.setSecrets);
  const [duressDialog, setDuressDialog] = React.useState(false);

  return (
    <SectionCard
      icon={<UserX className="h-4 w-4" />}
      title="Decoy & Duress"
      description="Mode umpan untuk situasi paksaan."
    >
      <SettingRow
        icon={<EyeOff className="h-4 w-4" />}
        title="Decoy Mode"
        description="PIN duress akan membuka data decoy, bukan data asli."
      >
        <Switch
          checked={config.decoyEnabled}
          onCheckedChange={(v) => updateConfig({ decoyEnabled: v })}
          aria-label="Aktifkan decoy mode"
        />
      </SettingRow>

      <SettingRow
        title="Set Duress PIN"
        description={
          config.duressPinHash
            ? "PIN duress sudah diatur. Klik untuk mengganti."
            : "PIN yang akan membuka mode decoy saat dipaksa."
        }
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDuressDialog(true)}
          className="gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {config.duressPinHash ? "Ganti PIN" : "Atur PIN"}
        </Button>
      </SettingRow>

      <SettingRow
        title="Panic Wipe"
        description="Hapus SEMUA data saat gesture panic dipicu."
      >
        <Switch
          checked={config.panicWipeEnabled}
          onCheckedChange={(v) => updateConfig({ panicWipeEnabled: v })}
          aria-label="Aktifkan panic wipe"
        />
      </SettingRow>

      {config.decoyEnabled && (
        <InfoNote>
          Saat PIN duress dimasukkan, aplikasi akan masuk ke mode decoy
          dengan tampilan kosong / contoh data palsu. Aktivitas ini dicatat
          diam-diam di audit log.
        </InfoNote>
      )}

      <PinSetupDialog
        open={duressDialog}
        onOpenChange={setDuressDialog}
        onConfirm={async (pin) => {
          try {
            const hash = await hashSecret(pin);
            setSecrets({ duressPinHash: hash });
            // Save to server for cross-device sync
            bulkMut.mutate(
              { ...serializeSecurityConfig(localConfig), duressPinHash: hash, decoyEnabled: "true" },
              {
                onSuccess: () => toast.success("PIN duress disimpan & tersinkron."),
                onError: () => toast.error("PIN duress lokal, gagal sync."),
              }
            );
            updateConfig({ duressPinHash: hash, decoyEnabled: true });
            auditLog(
              AUDIT_ACTIONS.PIN_CHANGE,
              "PIN duress dibuat",
              true,
            );
            setDuressDialog(false);
          } catch {
            toast.error("Gagal meng-hash PIN duress.");
          }
        }}
      />
    </SectionCard>
  );
}

// ============================================================
// F. Session
// ============================================================

function SessionSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  return (
    <SectionCard
      icon={<Timer className="h-4 w-4" />}
      title="Session"
      description="Pengaturan sesi login dan perangkat terpercaya."
    >
      <SettingRow
        title="Kedaluwarsa Sesi"
        description="Berapa lama sesi tetap aktif sebelum minta re-login."
      >
        <Select
          value={String(config.sessionExpiryMinutes)}
          onValueChange={(v) =>
            updateConfig({ sessionExpiryMinutes: Number(v) })
          }
        >
          <SelectTrigger size="sm" className="w-32" aria-label="Kedaluwarsa sesi">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tidak Pernah</SelectItem>
            <SelectItem value="15">15 menit</SelectItem>
            <SelectItem value="30">30 menit</SelectItem>
            <SelectItem value="60">1 jam</SelectItem>
            <SelectItem value="120">2 jam</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        title="Single Device Session"
        description="Hanya satu perangkat boleh login pada satu waktu."
      >
        <Switch
          checked={config.singleDeviceSession}
          onCheckedChange={(v) => updateConfig({ singleDeviceSession: v })}
          aria-label="Single device session"
        />
      </SettingRow>

      <SettingRow
        title="Ingat Perangkat"
        description="Bypass re-auth di perangkat yang dipercaya."
      >
        <Select
          value={String(config.rememberDeviceDays)}
          onValueChange={(v) =>
            updateConfig({ rememberDeviceDays: Number(v) })
          }
        >
          <SelectTrigger size="sm" className="w-32" aria-label="Ingat perangkat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Nonaktif</SelectItem>
            <SelectItem value="7">7 hari</SelectItem>
            <SelectItem value="30">30 hari</SelectItem>
            <SelectItem value="90">90 hari</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionCard>
  );
}

// ============================================================
// G. Trusted Devices
// ============================================================

function TrustedDevicesSection() {
  const trustedDevices = useTrustedDevices();
  const revokeMut = useRevokeTrustedDevice();

  const items = trustedDevices.data ?? [];

  function handleRevoke(id: string, name: string) {
    revokeMut.mutate(id, {
      onSuccess: () => {
        auditLog(
          AUDIT_ACTIONS.TRUSTED_DEVICE_ADD,
          `Mencabut perangkat: ${name}`,
          true,
        );
        toast.success("Perangkat dicabut.");
      },
      onError: () => toast.error("Gagal mencabut perangkat."),
    });
  }

  async function handleRevokeAll() {
    if (items.length === 0) return;
    for (const d of items) {
      try {
        await revokeMut.mutateAsync(d.id);
      } catch {
        // continue
      }
    }
    toast.success(`Semua ${items.length} perangkat dicabut.`);
  }

  return (
    <SectionCard
      icon={<Smartphone className="h-4 w-4" />}
      title="Perangkat Terpercaya"
      description="Perangkat yang dapat membuka kunci tanpa re-auth."
    >
      {items.length === 0 ? (
        <div className="py-3">
          <p className="rounded-md bg-muted/60 px-3 py-3 text-center text-xs text-muted-foreground">
            Belum ada perangkat terpercaya.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between py-2">
            <p className="text-xs font-medium text-muted-foreground">
              {items.length} perangkat terdaftar
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                  disabled={revokeMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Cabut Semua
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cabut semua perangkat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anda akan keluar dari semua perangkat dan perlu re-auth di
                    setiap perangkat berikutnya. Tindakan ini tidak bisa
                    dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevokeAll}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Cabut Semua
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto custom-scrollbar py-2 pr-1">
            {items.map((d) => {
              const expired = new Date(d.trustedUntil).getTime() < Date.now();
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Aktif terakhir: {formatTimeAgo(d.lastSeen)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {expired ? "Kedaluwarsa" : "Berlaku sampai"}:{" "}
                        {formatDateLong(d.trustedUntil)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {expired ? (
                      <Badge variant="outline" className="text-rose-500">
                        Kedaluwarsa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Aktif</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => handleRevoke(d.id, d.name)}
                      disabled={revokeMut.isPending}
                      aria-label={`Cabut ${d.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ============================================================
// H. Network Security
// ============================================================

function NetworkSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  return (
    <SectionCard
      icon={<Network className="h-4 w-4" />}
      title="Keamanan Jaringan"
      description="Pengaturan jaringan diterapkan via env / middleware."
    >
      <SettingRow
        icon={<Server className="h-4 w-4" />}
        title="Local-Only Mode"
        description="Hanya izinkan akses dari localhost (127.0.0.1)."
      >
        <Switch
          checked={config.localOnlyMode}
          onCheckedChange={(v) => updateConfig({ localOnlyMode: v })}
          aria-label="Local-only mode"
        />
      </SettingRow>

      <SettingRow
        title="IP Whitelist"
        description="Daftar IP/CIDR yang diizinkan, dipisah koma."
      >
        <Input
          value={config.ipWhitelist}
          onChange={(e) => updateConfig({ ipWhitelist: e.target.value })}
          placeholder="192.168.1.0/24, 10.0.0.5"
          className="h-8 w-56"
        />
      </SettingRow>

      <SettingRow
        title="Block Tor"
        description="Blokir akses dari jaringan Tor exit nodes."
      >
        <Switch
          checked={config.blockTor}
          onCheckedChange={(v) => updateConfig({ blockTor: v })}
          aria-label="Block Tor"
        />
      </SettingRow>

      <InfoNote>
        Pengaturan jaringan diterapkan via environment variables / middleware.
        Perubahan disimpan untuk konfigurasi, namun penerapan efektif
        memerlukan restart server atau variabel lingkungan yang sesuai.
      </InfoNote>
    </SectionCard>
  );
}

// ============================================================
// I. Encryption
// ============================================================

function EncryptionSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  return (
    <SectionCard
      icon={<FileLock2 className="h-4 w-4" />}
      title="Enkripsi"
      description="Lindungi data saat disimpan dan diekspor."
    >
      <SettingRow
        title="Enkripsi Database"
        description="Enkripsi database dengan SQLCipher (Coming soon)."
      >
        <Switch
          checked={config.encryptDatabase}
          onCheckedChange={(v) => updateConfig({ encryptDatabase: v })}
          aria-label="Enkripsi database"
          disabled
        />
      </SettingRow>
      {config.encryptDatabase && (
        <InfoNote>
          Enkripsi database memerlukan SQLCipher pada level server. Fitur ini
          akan segera tersedia (Coming soon).
        </InfoNote>
      )}

      <SettingRow
        title="Enkripsi Backup"
        description="Backup otomatis dienkripsi dengan AES-256."
      >
        <Switch
          checked={config.encryptBackups}
          onCheckedChange={(v) => updateConfig({ encryptBackups: v })}
          aria-label="Enkripsi backup"
        />
      </SettingRow>

      <SettingRow
        title="Enkripsi Ekspor"
        description="File ekspor dienkripsi dengan password."
      >
        <Switch
          checked={config.encryptExports}
          onCheckedChange={(v) => updateConfig({ encryptExports: v })}
          aria-label="Enkripsi ekspor"
        />
      </SettingRow>
    </SectionCard>
  );
}

// ============================================================
// J. Backup & Recovery
// ============================================================

function BackupSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  const [recoveryDialog, setRecoveryDialog] = React.useState(false);
  const [generatedPhrase, setGeneratedPhrase] = React.useState("");
  const [confirmCopied, setConfirmCopied] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!recoveryDialog) {
      setGeneratedPhrase("");
      setConfirmCopied(false);
      setCopied(false);
    }
  }, [recoveryDialog]);

  function handleToggleRecovery(v: boolean) {
    if (v) {
      const phrase = generateRecoveryPhrase();
      setGeneratedPhrase(phrase);
      setRecoveryDialog(true);
    } else {
      updateConfig({ recoveryPhraseEnabled: false });
      toast.success("Recovery phrase dinonaktifkan.");
    }
  }

  async function handleConfirmRecovery() {
    if (!validateRecoveryPhrase(generatedPhrase)) {
      toast.error("Frase pemulihan tidak valid.");
      return;
    }
    try {
      const hash = await hashSecret(generatedPhrase);
      updateConfig({ recoveryPhraseEnabled: true });
      auditLog(
        AUDIT_ACTIONS.PIN_CHANGE,
        `Recovery phrase dibuat (hash: ${hash.slice(0, 8)}…)`,
        true,
      );
      toast.success("Recovery phrase diaktifkan.");
      setRecoveryDialog(false);
    } catch {
      toast.error("Gagal menyimpan recovery phrase.");
    }
  }

  async function copyPhrase() {
    try {
      await navigator.clipboard.writeText(generatedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Frase disalin ke clipboard.");
    } catch {
      toast.error("Gagal menyalin.");
    }
  }

  return (
    <SectionCard
      icon={<DatabaseBackup className="h-4 w-4" />}
      title="Backup & Recovery"
      description="Cadangan otomatis dan pemulihan darurat."
    >
      <SettingRow
        title="Auto-Backup"
        description="Buat backup otomatis secara berkala."
      >
        <Switch
          checked={config.autoBackupEnabled}
          onCheckedChange={(v) => updateConfig({ autoBackupEnabled: v })}
          aria-label="Auto-backup"
        />
      </SettingRow>

      {config.autoBackupEnabled && (
        <SettingRow
          title="Interval Backup"
          description="Seberapa sering backup dibuat."
        >
          <Select
            value={String(config.autoBackupIntervalDays)}
            onValueChange={(v) =>
              updateConfig({ autoBackupIntervalDays: Number(v) })
            }
          >
            <SelectTrigger size="sm" className="w-32" aria-label="Interval backup">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 hari</SelectItem>
              <SelectItem value="14">14 hari</SelectItem>
              <SelectItem value="30">30 hari</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      )}

      <SettingRow
        title="Recovery Phrase"
        description="12 kata untuk memulihkan akses jika lupa PIN/password."
      >
        <Switch
          checked={config.recoveryPhraseEnabled}
          onCheckedChange={handleToggleRecovery}
          aria-label="Recovery phrase"
        />
      </SettingRow>

      {config.recoveryPhraseEnabled && (
        <InfoNote>
          Recovery phrase aktif. Simpan baik-baik 12 kata Anda di tempat aman
          offline. Siapapun yang memiliki phrase ini dapat memulihkan akses.
        </InfoNote>
      )}

      <Dialog open={recoveryDialog} onOpenChange={setRecoveryDialog}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recovery Phrase Anda</DialogTitle>
            <DialogDescription>
              Tulis 12 kata berikut di kertas dan simpan di tempat aman.
              Jangan pernah bagikan atau simpan secara digital tanpa enkripsi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-amber-500/5 p-3 ring-1 ring-amber-500/20">
              {generatedPhrase.split(" ").map((word, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-md bg-card px-2 py-1.5 text-xs"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="font-medium">{word}</span>
                </div>
              ))}
            </div>

            <div className="rounded-md bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Peringatan
              </p>
              <p className="mt-1">
                Frase ini hanya ditampilkan sekali. Jika hilang, tidak bisa
                dipulihkan. Pastikan sudah mencatatnya sebelum menutup dialog
                ini.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPhrase}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Tersalin" : "Salin"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Salin hanya untuk tempat sementara.
              </span>
            </div>

            <label className="flex items-center gap-2 rounded-md bg-muted/60 p-2.5">
              <Checkbox
                checked={confirmCopied}
                onCheckedChange={(v) => setConfirmCopied(Boolean(v))}
              />
              <span className="text-xs">
                Saya sudah mencatat frase ini di tempat aman.
              </span>
            </label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              onClick={handleConfirmRecovery}
              disabled={!confirmCopied}
              className="gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              Aktifkan Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// ============================================================
// K. Audit Log
// ============================================================

function AuditLogSection({
  config,
  updateConfig,
}: {
  config: SecurityConfig;
  updateConfig: (p: Partial<SecurityConfig>) => void;
}) {
  const [auditDialog, setAuditDialog] = React.useState(false);

  return (
    <SectionCard
      icon={<History className="h-4 w-4" />}
      title="Audit Log"
      description="Catatan aktivitas keamanan dan notifikasi."
    >
      <SettingRow
        title="Aktifkan Audit Log"
        description="Catat setiap aktivitas keamanan ke database."
      >
        <Switch
          checked={config.auditLogEnabled}
          onCheckedChange={(v) => updateConfig({ auditLogEnabled: v })}
          aria-label="Aktifkan audit log"
        />
      </SettingRow>

      <SettingRow
        icon={<BellRing className="h-4 w-4" />}
        title="Notifikasi Percobaan Gagal"
        description="Beri peringatan saat ada percobaan login gagal."
      >
        <Switch
          checked={config.failedAttemptAlert}
          onCheckedChange={(v) => updateConfig({ failedAttemptAlert: v })}
          aria-label="Notifikasi percobaan gagal"
        />
      </SettingRow>

      <SettingRow
        title="Notifikasi Perangkat Baru"
        description="Beri peringatan saat login dari perangkat baru."
      >
        <Switch
          checked={config.newDeviceAlert}
          onCheckedChange={(v) => updateConfig({ newDeviceAlert: v })}
          aria-label="Notifikasi perangkat baru"
        />
      </SettingRow>

      <SettingRow
        title="Lihat Audit Log"
        description="Tinjau 100 entri aktivitas terbaru."
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAuditDialog(true)}
          className="gap-1.5"
        >
          <History className="h-3.5 w-3.5" />
          Lihat Log
        </Button>
      </SettingRow>

      <AuditLogDialog open={auditDialog} onOpenChange={setAuditDialog} />
    </SectionCard>
  );
}

function AuditLogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [actionFilter, setActionFilter] = React.useState<string>("ALL");
  const query = useAuditLog({
    limit: 100,
    action: actionFilter === "ALL" ? undefined : actionFilter,
  });

  const entries = query.data?.data ?? [];

  const actionOptions = [
    "ALL",
    AUDIT_ACTIONS.LOGIN_SUCCESS,
    AUDIT_ACTIONS.LOGIN_FAILED,
    AUDIT_ACTIONS.LOCK,
    AUDIT_ACTIONS.UNLOCK,
    AUDIT_ACTIONS.PIN_CHANGE,
    AUDIT_ACTIONS.SETTING_CHANGE,
    AUDIT_ACTIONS.BIOMETRIC_REGISTER,
    AUDIT_ACTIONS.BIOMETRIC_LOGIN,
    AUDIT_ACTIONS.RATE_LIMIT_HIT,
    AUDIT_ACTIONS.TRUSTED_DEVICE_ADD,
    AUDIT_ACTIONS.EXPORT,
    AUDIT_ACTIONS.DELETE_TX,
    AUDIT_ACTIONS.PANIC_WIPE,
    AUDIT_ACTIONS.DECOY_ACCESS,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Audit Log
          </DialogTitle>
          <DialogDescription>
            {query.data?.total ?? 0} total entri · menampilkan{" "}
            {entries.length} terbaru
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Label className="text-xs">Filter:</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger size="sm" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a === "ALL" ? "Semua Aksi" : auditActionLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {query.isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        <ScrollArea className="max-h-[55vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="w-32">Aksi</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="w-24">IP / Sidik</TableHead>
                <TableHead className="w-32">Waktu</TableHead>
                <TableHead className="w-16 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <span className="text-sm text-muted-foreground">
                      Tidak ada entri audit log.
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {auditActionLabel(e.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs">
                    <span className="line-clamp-2 text-muted-foreground">
                      {e.detail ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {e.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {formatTimeAgo(e.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.success ? (
                      <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="ml-auto h-3.5 w-3.5 text-rose-500" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// L. Emergency Actions (Danger Zone)
// ============================================================

function EmergencySection() {
  const panicWipeMut = usePanicWipe();
  const [step1, setStep1] = React.useState(false);
  const [step2, setStep2] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => {
    if (!step1) {
      setStep2(false);
      setConfirmText("");
    }
  }, [step1]);

  async function handleWipe() {
    try {
      await panicWipeMut.mutateAsync();
      toast.success("Semua data telah dihapus permanen.");
      setStep1(false);
      setStep2(false);
      setConfirmText("");
      // Reload the page so all client-side state (including security store,
      // local config, and React Query cache) is fully reset.
      if (typeof window !== "undefined") {
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      toast.error("Gagal menghapus data. Coba lagi.");
    }
  }

  const confirmValid = confirmText.trim().toUpperCase() === "HAPUS";

  return (
    <SectionCard
      icon={<AlertTriangle className="h-4 w-4" />}
      title="Aksi Darurat"
      description="Tindakan ireversibel. Gunakan dengan sangat hati-hati."
      tone="danger"
    >
      <SettingRow
        icon={<Power className="h-4 w-4" />}
        title="Panic Wipe"
        description="Hapus segera SEMUA data keuangan, audit log, dan pengaturan."
      >
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setStep1(true)}
          className="gap-1.5"
          disabled={panicWipeMut.isPending}
        >
          <Power className="h-3.5 w-3.5" />
          Panic Wipe
        </Button>
      </SettingRow>

      <SettingRow
        icon={<Trash2 className="h-4 w-4" />}
        title="Hapus Semua Data"
        description="Sama dengan Panic Wipe — hapus permanen seluruh data."
      >
        <AlertDialog
          open={step1}
          onOpenChange={(v) => {
            setStep1(v);
            if (!v) {
              setStep2(false);
              setConfirmText("");
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={panicWipeMut.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Semua
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus SEMUA data?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus permanen seluruh transaksi,
                kategori, akun, anggaran, target, dan pengaturan. Data tidak
                bisa dikembalikan. Lanjutkan?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setStep2(true)}
                className="bg-rose-500 hover:bg-rose-600"
              >
                Lanjutkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingRow>

      <InfoNote>
        Setelah wipe, halaman akan dimuat ulang otomatis. Pastikan Anda sudah
        memiliki backup sebelum melanjutkan.
      </InfoNote>

      {/* Step 2: Final confirmation */}
      <AlertDialog open={step2} onOpenChange={setStep2}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Terakhir</AlertDialogTitle>
            <AlertDialogDescription>
              Ketik <strong>HAPUS</strong> di kotak di bawah untuk
              mengkonfirmasi. Setelah konfirmasi, semua 19 tabel database akan
              dihapus dalam satu transaksi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik HAPUS"
              className="font-semibold uppercase"
              autoFocus
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Ketik persis: <span className="font-mono font-bold">HAPUS</span>
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipe}
              disabled={!confirmValid || panicWipeMut.isPending}
              className="gap-1.5 bg-rose-500 hover:bg-rose-600"
            >
              {panicWipeMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}

// ============================================================
// Default export
// ============================================================

export default SecuritySection;
