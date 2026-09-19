"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  token: string;
  mode: "password" | "email";
  emailHint?: string | null;
}

/**
 * ShareAuthGate — full-screen card shown when a share link requires a
 * password or verified email before data is exposed. Posts to
 * /api/shares/[token]/verify, and on success reloads the page so the
 * server component re-renders with the unlocked data.
 */
export function ShareAuthGate({ token, mode, emailHint }: Props) {
  const [value, setValue] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      toast.error(
        mode === "password" ? "Masukkan password terlebih dahulu." : "Masukkan email Anda.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shares/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "password" ? { password: value } : { email: value },
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          mode === "password"
            ? body?.error ?? "Password salah"
            : body?.error ?? "Email tidak cocok";
        toast.error(msg);
        return;
      }
      toast.success("Akses berhasil dibuka.");
      // Reload so the server component renders the unlocked view.
      window.location.reload();
    } catch {
      toast.error("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/40 px-4 py-12">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-md"
      >
        {/* Branding */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <WalletIcon />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            DompetKu
          </span>
        </div>

        <Card className="border-border/60 p-6 shadow-xl sm:p-8">
          {/* Locked icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            {mode === "password" ? (
              <Lock className="h-7 w-7 text-primary" />
            ) : (
              <Mail className="h-7 w-7 text-primary" />
            )}
          </div>

          <h1 className="text-center text-xl font-bold tracking-tight text-foreground">
            Akses Dibutuhkan
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted-foreground">
            {mode === "password" ? (
              <>
                Pemilik data memproteksi link ini dengan password. Masukkan
                password untuk membuka akses.
              </>
            ) : (
              <>
                Pemilik data membatasi akses berdasarkan email. Masukkan email
                yang diizinkan untuk membuka link ini.
                {emailHint && (
                  <>
                    {" "}
                    Petunjuk:{" "}
                    <span className="font-medium text-foreground">
                      {maskEmailHint(emailHint)}
                    </span>
                  </>
                )}
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="gate-input" className="text-xs font-medium uppercase tracking-wide">
                {mode === "password" ? "Password" : "Email"}
              </Label>
              <div className="relative">
                <Input
                  id="gate-input"
                  type={
                    mode === "password"
                      ? showPassword
                        ? "text"
                        : "password"
                      : "email"
                  }
                  autoComplete={
                    mode === "password" ? "current-password" : "email"
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={
                    mode === "password" ? "Masukkan password" : "nama@email.com"
                  }
                  className="h-11 pr-10"
                  autoFocus
                  disabled={submitting}
                />
                {mode === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={submitting || !value.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Buka Akses
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke DompetKu
              </Link>
            </Button>
          </div>
        </Card>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Akses dilindungi oleh DompetKu. Setiap percobaan akses dicatat.
        </p>
      </motion.div>
    </main>
  );
}

/** Wallet icon — simple inline SVG (emerald) so we don't depend on extra imports. */
function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M3 5v14" />
      <path d="M21 12a2 2 0 0 0-2-2h-5a2 2 0 0 0 0 4h5a2 2 0 0 0 2-2z" />
    </svg>
  );
}

/** Mask email hint so it doesn't fully reveal the required email (e.g. "j••@gmail.com"). */
function maskEmailHint(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}••@${domain}`;
  return `${local[0]}${"•".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}
