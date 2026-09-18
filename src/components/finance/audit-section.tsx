"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  Trash2,
  Download,
  KeyRound,
  Fingerprint,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateLong, getMonthLabel } from "@/lib/format";
import { useAuditLog } from "@/lib/hooks";
import { AUDIT_ACTIONS } from "@/lib/audit";

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  LOGIN_SUCCESS: { label: "Login Berhasil", icon: <LogIn className="h-3.5 w-3.5" />, color: "#10b981" },
  LOGIN_FAILED: { label: "Login Gagal", icon: <XCircle className="h-3.5 w-3.5" />, color: "#ef4444" },
  LOGOUT: { label: "Logout", icon: <LogOut className="h-3.5 w-3.5" />, color: "#6b7280" },
  LOCK: { label: "Terkunci", icon: <Lock className="h-3.5 w-3.5" />, color: "#f59e0b" },
  UNLOCK: { label: "Terbuka", icon: <Unlock className="h-3.5 w-3.5" />, color: "#10b981" },
  PIN_CHANGE: { label: "PIN Diubah", icon: <KeyRound className="h-3.5 w-3.5" />, color: "#0891b2" },
  EXPORT: { label: "Export Data", icon: <Download className="h-3.5 w-3.5" />, color: "#0891b2" },
  IMPORT: { label: "Import Data", icon: <Download className="h-3.5 w-3.5" />, color: "#8b5cf6" },
  DELETE_TX: { label: "Hapus Transaksi", icon: <Trash2 className="h-3.5 w-3.5" />, color: "#ef4444" },
  DELETE_ACCOUNT: { label: "Hapus Akun", icon: <Trash2 className="h-3.5 w-3.5" />, color: "#ef4444" },
  SETTING_CHANGE: { label: "Ubah Setting", icon: <Activity className="h-3.5 w-3.5" />, color: "#6b7280" },
  PANIC_WIPE: { label: "Panic Wipe", icon: <ShieldAlert className="h-3.5 w-3.5" />, color: "#dc2626" },
  DECOY_ACCESS: { label: "Akses Decoy", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "#f59e0b" },
  BIOMETRIC_REGISTER: { label: "Daftar Biometrik", icon: <Fingerprint className="h-3.5 w-3.5" />, color: "#10b981" },
  BIOMETRIC_LOGIN: { label: "Login Biometrik", icon: <Fingerprint className="h-3.5 w-3.5" />, color: "#10b981" },
  RATE_LIMIT_HIT: { label: "Rate Limit", icon: <ShieldAlert className="h-3.5 w-3.5" />, color: "#f59e0b" },
  TRUSTED_DEVICE_ADD: { label: "Device Baru", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#10b981" },
  BACKUP_CREATE: { label: "Backup Dibuat", icon: <Download className="h-3.5 w-3.5" />, color: "#0891b2" },
  RESTORE: { label: "Restore Data", icon: <RefreshCw className="h-3.5 w-3.5" />, color: "#8b5cf6" },
};

export function AuditSection() {
  const [actionFilter, setActionFilter] = React.useState<string>("ALL");
  const { data, isLoading, refetch, isFetching } = useAuditLog({
    limit: 100,
    action: actionFilter === "ALL" ? undefined : actionFilter,
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;

  // Stats
  const failedCount = entries.filter((e) => !e.success).length;
  const loginAttempts = entries.filter((e) =>
    [AUDIT_ACTIONS.LOGIN_SUCCESS, AUDIT_ACTIONS.LOGIN_FAILED].includes(e.action as typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS])
  ).length;
  const failedLogins = entries.filter(
    (e) => e.action === AUDIT_ACTIONS.LOGIN_FAILED
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Audit Log</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Riwayat aktivitas keamanan aplikasi Anda.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Aktivitas"
          value={total}
          icon={<Activity className="h-4 w-4" />}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Percobaan Gagal"
          value={failedCount}
          icon={<XCircle className="h-4 w-4" />}
          color="bg-destructive/10 text-destructive"
        />
        <StatCard
          label="Login Attempt"
          value={loginAttempts}
          icon={<LogIn className="h-4 w-4" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Login Gagal"
          value={failedLogins}
          icon={<ShieldAlert className="h-4 w-4" />}
          color="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter:</span>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Semua aktivitas" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">Semua aktivitas</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Timeline list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center">
          <Activity className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Belum ada aktivitas tercatat
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aktivitas keamanan akan muncul di sini setelah Anda mengaktifkan keamanan.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {entries.map((entry, idx) => {
            const meta = ACTION_LABELS[entry.action] ?? {
              label: entry.action,
              icon: <Activity className="h-3.5 w-3.5" />,
              color: "#6b7280",
            };
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.01, 0.3) }}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {meta.label}
                    </span>
                    {!entry.success && (
                      <Badge variant="destructive" className="text-[10px]">
                        Gagal
                      </Badge>
                    )}
                  </div>
                  {entry.detail && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.detail}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{formatDateLong(entry.createdAt)}</span>
                    {entry.ipAddress && (
                      <>
                        <span className="text-border">·</span>
                        <span className="font-mono">
                          {entry.ipAddress.slice(0, 16)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </Card>
      )}

      {entries.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Menampilkan {entries.length} dari {total} aktivitas
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", color)}>
          {icon}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
