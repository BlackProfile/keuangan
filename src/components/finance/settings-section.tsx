"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  Clock,
  Database,
  Download,
  EyeOff,
  FileJson,
  Info,
  Loader2,
  Lock,
  Monitor,
  Moon,
  Palette,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { hashPin } from "@/lib/format";
import { api } from "@/lib/api";
import {
  useImportCsv,
  useSeed,
  useSettings,
  useUpdateSetting,
} from "@/lib/hooks";
import { SecuritySection } from "@/components/finance/security-section";
import type { AppSettings } from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  pinEnabled: false,
  pinHash: null,
  hideAmounts: false,
  currency: "IDR",
  reminderEnabled: false,
  reminderHour: 20,
  theme: "system",
};

function parseSettings(raw: Record<string, string> | undefined): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;
  return {
    pinEnabled: raw.pinEnabled === "true",
    pinHash: raw.pinHash ?? null,
    hideAmounts: raw.hideAmounts === "true",
    currency: raw.currency ?? "IDR",
    reminderEnabled: raw.reminderEnabled === "true",
    reminderHour: Number(raw.reminderHour ?? 20),
    theme: (raw.theme as AppSettings["theme"]) ?? "system",
  };
}

export function SettingsSection() {
  const { data: rawSettings, isLoading } = useSettings();
  const settings = React.useMemo(
    () => parseSettings(rawSettings),
    [rawSettings],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Pengaturan</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sesuaikan aplikasi sesuai kebutuhan Anda.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <SecuritySection />
          <TampilanSection />
          <PengingatSection settings={settings} />
          <DataSection />
          <TentangSection />
        </>
      )}
    </div>
  );
}

// ============================================================
// Shared layout components
// ============================================================

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ============================================================
// A. Keamanan
// ============================================================

function KeamananSection({ settings }: { settings: AppSettings }) {
  const updateMut = useUpdateSetting();
  const [pinDialogOpen, setPinDialogOpen] = React.useState(false);
  const [pin, setPin] = React.useState("");

  function handleSwitchChange(enabled: boolean) {
    if (enabled) {
      setPin("");
      setPinDialogOpen(true);
    } else {
      // Disable: clear pinHash and pinEnabled
      updateMut.mutate({ key: "pinHash", value: "" });
      updateMut.mutate({ key: "pinEnabled", value: "false" });
      toast.success("PIN dinonaktifkan.");
    }
  }

  async function handleSavePin() {
    if (pin.length !== 4) {
      toast.error("PIN harus 4 digit.");
      return;
    }
    try {
      const hash = await hashPin(pin);
      updateMut.mutate({ key: "pinHash", value: hash });
      updateMut.mutate({ key: "pinEnabled", value: "true" });
      setPin("");
      setPinDialogOpen(false);
      toast.success("PIN aktif. Aplikasi akan terkunci saat dibuka.");
    } catch {
      toast.error("Gagal menghash PIN. Coba lagi.");
    }
  }

  function toggleHideAmounts(enabled: boolean) {
    updateMut.mutate({
      key: "hideAmounts",
      value: enabled ? "true" : "false",
    });
    toast.success(
      enabled ? "Nominal disembunyikan." : "Nominal ditampilkan.",
    );
  }

  return (
    <SectionCard
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Keamanan"
      description="Lindungi privasi data keuangan Anda."
    >
      <SettingRow
        icon={<Lock className="h-4 w-4" />}
        title="Kunci PIN"
        description="Minta PIN 4 digit saat membuka aplikasi."
      >
        <Switch
          checked={settings.pinEnabled}
          onCheckedChange={handleSwitchChange}
          disabled={updateMut.isPending}
          aria-label="Aktifkan kunci PIN"
        />
      </SettingRow>

      <SettingRow
        icon={<EyeOff className="h-4 w-4" />}
        title="Sembunyikan Nominal"
        description="Sembunyikan jumlah uang di semua layar."
      >
        <Switch
          checked={settings.hideAmounts}
          onCheckedChange={toggleHideAmounts}
          disabled={updateMut.isPending}
          aria-label="Sembunyikan nominal"
        />
      </SettingRow>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Buat PIN 4 Digit</DialogTitle>
            <DialogDescription>
              PIN ini akan diminta setiap kali aplikasi dibuka.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={(v) => setPin(v)}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-center text-xs text-muted-foreground">
              Ingat PIN ini — tidak bisa dipulihkan jika lupa.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              onClick={handleSavePin}
              disabled={pin.length !== 4 || updateMut.isPending}
              className="gap-1.5"
            >
              {updateMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Simpan PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// ============================================================
// B. Tampilan
// ============================================================

function TampilanSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const themes: Array<{
    value: "light" | "dark" | "system";
    label: string;
    icon: React.ReactNode;
  }> = [
    { value: "light", label: "Terang", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Gelap", icon: <Moon className="h-4 w-4" /> },
    {
      value: "system",
      label: "Sistem",
      icon: <Monitor className="h-4 w-4" />,
    },
  ];

  return (
    <SectionCard
      icon={<Palette className="h-4 w-4" />}
      title="Tampilan"
      description="Pilih tema sesuai preferensi Anda."
    >
      <SettingRow
        title="Tema"
        description="Terang, gelap, atau ikuti sistem."
      >
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {themes.map((t) => {
            const active = mounted && theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={active}
                aria-label={`Tema ${t.label}`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </SettingRow>
    </SectionCard>
  );
}

// ============================================================
// C. Pengingat
// ============================================================

function PengingatSection({ settings }: { settings: AppSettings }) {
  const updateMut = useUpdateSetting();
  const [hour, setHour] = React.useState(String(settings.reminderHour));

  React.useEffect(() => {
    setHour(String(settings.reminderHour));
  }, [settings.reminderHour]);

  // Schedule in-app browser notifications while the app is open
  React.useEffect(() => {
    if (!settings.reminderEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const targetHour = settings.reminderHour;
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() !== targetHour) return;
      const nowMin = now.getMinutes();
      // Fire once near the top of the hour (first 5 minutes)
      if (nowMin > 5) return;
      const key = `dompetku-reminder-${now.toDateString()}`;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
        if (Notification.permission === "granted") {
          new Notification("DompetKu", {
            body: "Saatnya mencatat transaksi hari ini! 📒",
          });
        }
      } catch {
        // localStorage may be unavailable (private mode) — ignore
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [settings.reminderEnabled, settings.reminderHour]);

  async function handleToggleReminder(enabled: boolean) {
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.warning(
          "Izin notifikasi ditolak. Pengingat aktif tapi tanpa notifikasi.",
        );
      }
    }
    updateMut.mutate({
      key: "reminderEnabled",
      value: enabled ? "true" : "false",
    });
    toast.success(enabled ? "Pengingat aktif." : "Pengingat dinonaktifkan.");
  }

  function handleHourChange(v: string) {
    setHour(v);
    const num = Number(v);
    if (Number.isInteger(num) && num >= 0 && num <= 23) {
      updateMut.mutate({ key: "reminderHour", value: String(num) });
    }
  }

  function handleTestNotification() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser tidak mendukung notifikasi.");
      return;
    }
    if (Notification.permission !== "granted") {
      toast.warning("Berikan izin notifikasi dulu.");
      return;
    }
    new Notification("DompetKu", {
      body: "Ini contoh pengingat. 📒",
    });
    toast.success("Notifikasi tes dikirim.");
  }

  return (
    <SectionCard
      icon={<Bell className="h-4 w-4" />}
      title="Pengingat"
      description="Pengingat harian untuk mencatat transaksi."
    >
      <SettingRow
        icon={<Clock className="h-4 w-4" />}
        title="Pengingat Catat Harian"
        description="Aktifkan pengingat untuk mencatat setiap hari."
      >
        <Switch
          checked={settings.reminderEnabled}
          onCheckedChange={handleToggleReminder}
          disabled={updateMut.isPending}
          aria-label="Aktifkan pengingat"
        />
      </SettingRow>

      {settings.reminderEnabled && (
        <>
          <SettingRow
            title="Waktu Pengingat"
            description="Pengingat akan muncul setiap hari pada jam ini."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => handleHourChange(e.target.value)}
                className="h-9 w-16 text-center"
                aria-label="Jam pengingat"
              />
              <span className="text-xs text-muted-foreground">:00</span>
            </div>
          </SettingRow>

          <SettingRow
            title="Uji Notifikasi"
            description="Kirim notifikasi tes untuk memastikan izin aktif."
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Tes
            </Button>
          </SettingRow>
        </>
      )}
    </SectionCard>
  );
}

// ============================================================
// D. Data
// ============================================================

function DataSection() {
  const importMut = useImportCsv();
  const seedMut = useSeed();
  const [importOpen, setImportOpen] = React.useState(false);
  const [csvRows, setCsvRows] = React.useState<Array<Record<string, string>>>(
    [],
  );
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleExportCsv() {
    window.location.href = api.exportTransactionsUrl();
    toast.success("Mengekspor CSV...");
  }

  function handleBackup() {
    window.location.href = api.backupUrl();
    toast.success("Membuat backup JSON...");
  }

  function handleImportClick() {
    setCsvRows([]);
    setCsvHeaders([]);
    setImportOpen(true);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const { headers, rows } = parseCsv(text);
      if (rows.length === 0) {
        toast.error("CSV kosong atau tidak valid.");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
    };
    reader.onerror = () => toast.error("Gagal membaca file CSV.");
    reader.readAsText(file);
  }

  function handleImport() {
    if (csvRows.length === 0) return;
    importMut.mutate(csvRows, {
      onSuccess: (res) => {
        toast.success(
          `${res.imported} transaksi diimpor, ${res.skipped} dilewati.`,
        );
        setImportOpen(false);
        setCsvRows([]);
        setCsvHeaders([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err) => {
        toast.error(err.message || "Gagal mengimpor CSV.");
      },
    });
  }

  function handleCloseImport() {
    setImportOpen(false);
    setCsvRows([]);
    setCsvHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <SectionCard
      icon={<Database className="h-4 w-4" />}
      title="Data"
      description="Kelola data transaksi Anda."
    >
      <SettingRow
        icon={<Upload className="h-4 w-4" />}
        title="Impor CSV"
        description="Impor transaksi dari file CSV."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          className="gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          Impor
        </Button>
      </SettingRow>

      <SettingRow
        icon={<Download className="h-4 w-4" />}
        title="Ekspor CSV"
        description="Unduh semua transaksi sebagai CSV."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Ekspor
        </Button>
      </SettingRow>

      <SettingRow
        icon={<FileJson className="h-4 w-4" />}
        title="Backup JSON"
        description="Cadangkan seluruh data (kategori, transaksi, dll)."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackup}
          className="gap-1.5"
        >
          <FileJson className="h-3.5 w-3.5" />
          Backup
        </Button>
      </SettingRow>

      <SettingRow
        icon={<Sparkles className="h-4 w-4" />}
        title="Muat Data Contoh"
        description="Isi aplikasi dengan kategori & transaksi contoh."
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Muat
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Muat data contoh?</AlertDialogTitle>
              <AlertDialogDescription>
                Aplikasi akan diisi dengan kategori default dan transaksi
                contoh. Data yang sudah ada tidak akan dihapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  seedMut.mutate(undefined, {
                    onSuccess: () =>
                      toast.success("Data contoh berhasil dimuat."),
                    onError: (err) =>
                      toast.error(
                        err.message || "Gagal memuat data contoh.",
                      ),
                  });
                }}
                disabled={seedMut.isPending}
                className="gap-1.5"
              >
                {seedMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Muat Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingRow>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-2xl"
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 p-5 pb-4">
            <div>
              <DialogTitle className="text-base">Impor CSV</DialogTitle>
              <DialogDescription className="text-xs">
                Pilih file CSV berisi transaksi Anda.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {csvRows.length > 0
                  ? `${csvRows.length} baris siap diimpor`
                  : "Pilih file CSV"}
              </span>
              <span className="text-xs text-muted-foreground">
                Kolom: Tanggal, Tipe, Kategori, Keterangan, Jumlah, Catatan
              </span>
            </button>

            {csvRows.length > 0 && (
              <div className="custom-scrollbar max-h-72 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map((h) => (
                        <TableHead key={h} className="text-xs">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {csvHeaders.map((h) => (
                          <TableCell key={h} className="text-xs">
                            {row[h] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {csvRows.length > 50 && (
                  <p className="border-t border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                    Menampilkan 50 dari {csvRows.length} baris
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <Button variant="outline" onClick={handleCloseImport}>
              Batal
            </Button>
            <Button
              onClick={handleImport}
              disabled={csvRows.length === 0 || importMut.isPending}
              className="gap-1.5"
            >
              {importMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Impor{csvRows.length > 0 ? ` (${csvRows.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// ============================================================
// CSV parser (handles quoted fields with commas)
// ============================================================

function parseCsv(text: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  // Strip BOM if present
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = splitLine(lines[0]);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    rows.push(obj);
  }
  return { headers, rows };
}

// ============================================================
// E. Tentang
// ============================================================

function TentangSection() {
  return (
    <SectionCard
      icon={<Info className="h-4 w-4" />}
      title="Tentang"
      description="Informasi aplikasi."
    >
      <SettingRow
        title="Versi"
        description="DompetKu v1.0.0"
      >
        <Badge variant="secondary">v1.0.0</Badge>
      </SettingRow>
      <SettingRow
        title="Teknologi"
        description="Next.js 16, TypeScript, Prisma, Tailwind CSS, shadcn/ui"
      >
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Modern Stack
        </Badge>
      </SettingRow>
      <SettingRow
        title="Penyimpanan"
        description="Semua data tersimpan lokal di perangkat Anda menggunakan SQLite."
      >
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Lokal
        </Badge>
      </SettingRow>
    </SectionCard>
  );
}
