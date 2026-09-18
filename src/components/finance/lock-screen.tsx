"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Fingerprint,
  Grid3x3,
  Hash,
  HelpCircle,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Timer,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { useSecurityStore } from "@/lib/security-store";
import {
  constantTimeCompare,
  getDeviceFingerprint,
  hashSecret,
} from "@/lib/crypto";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit";
import type { SecurityConfig } from "@/lib/security-defaults";
import { useAddTrustedDevice, useBiometricList } from "@/lib/hooks";
import { api } from "@/lib/api";

export interface LockScreenProps {
  config: SecurityConfig;
  onUnlock: () => void;
  onDecoy: () => void;
  onPanic?: () => void;
  onWipe?: () => void;
  children?: React.ReactNode;
}

type Method = "pin" | "password" | "pattern" | "biometric";

const PANIC_CLICK_THRESHOLD = 5;
const PANIC_CLICK_WINDOW_MS = 1000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// --- WebAuthn helpers ----------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

async function requestBiometricAssertion(
  credentialIds: string[]
): Promise<{ credentialId: string; counter: number } | null> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return null;
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: credentialIds.map((id) => ({
      type: "public-key",
      id: base64ToBuffer(id),
      transports: ["internal", "hybrid"] as AuthenticatorTransport[],
    })),
  };
  const cred = (await navigator.credentials.get({
    publicKey: options,
  })) as PublicKeyCredential | null;
  if (!cred) return null;
  return {
    credentialId: bufferToBase64(cred.rawId),
    counter: Date.now(),
  };
}

// --- Watermark -----------------------------------------------------------

function Watermark({ text }: { text: string }) {
  const safe = (text || "Pribadi").slice(0, 60);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><text x='10' y='140' fill='currentColor' font-size='14' font-weight='500' transform='rotate(-45 130 130)'>${safe}</text></svg>`;
  const bg = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden text-foreground opacity-[0.06] dark:opacity-[0.09]"
      style={{
        backgroundImage: bg,
        backgroundRepeat: "repeat",
        backgroundSize: "260px 260px",
      }}
    />
  );
}

// --- Pattern grid --------------------------------------------------------

interface PatternGridProps {
  disabled?: boolean;
  onComplete: (pattern: string) => void;
}

function PatternGrid({ disabled, onComplete }: PatternGridProps) {
  const [selected, setSelected] = React.useState<number[]>([]);
  const selectedRef = React.useRef<number[]>([]);
  const draggingRef = React.useRef(false);

  const finish = React.useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const current = selectedRef.current;
    if (current.length >= 4) {
      onComplete(current.join("-"));
    }
    window.setTimeout(() => {
      selectedRef.current = [];
      setSelected([]);
    }, 350);
  }, [onComplete]);

  React.useEffect(() => {
    window.addEventListener("mouseup", finish);
    window.addEventListener("touchend", finish);
    return () => {
      window.removeEventListener("mouseup", finish);
      window.removeEventListener("touchend", finish);
    };
  }, [finish]);

  const addDot = (idx: number) => {
    if (disabled) return;
    if (!draggingRef.current) draggingRef.current = true;
    if (selectedRef.current.includes(idx)) return;
    selectedRef.current = [...selectedRef.current, idx];
    setSelected(selectedRef.current);
  };

  return (
    <div className="mx-auto grid w-full max-w-[240px] grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => {
        const active = selected.includes(i);
        const order = selected.indexOf(i) + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              addDot(i);
            }}
            onMouseEnter={() => {
              if (draggingRef.current) addDot(i);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              addDot(i);
            }}
            className={cn(
              "relative aspect-square rounded-full border-2 transition-all duration-150",
              "flex items-center justify-center",
              active
                ? "scale-110 border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "border-muted-foreground/25 bg-muted/40 hover:border-primary/60 hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50"
            )}
            aria-label={`Titik pola ${i + 1}`}
          >
            <span
              className={cn(
                "rounded-full transition-all",
                active ? "h-3 w-3 bg-primary-foreground" : "h-2 w-2 bg-muted-foreground/40"
              )}
            />
            {active && order > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {order}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- Setup flow sub-component -------------------------------------------

interface SetupFlowProps {
  needsPin: boolean;
  needsPassword: boolean;
  setupPin: string;
  setSetupPin: (v: string) => void;
  setupPinConfirm: string;
  setSetupPinConfirm: (v: string) => void;
  setupPassword: string;
  setSetupPassword: (v: string) => void;
  setupPasswordConfirm: string;
  setSetupPasswordConfirm: (v: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmitPin: () => void;
  onSubmitPassword: () => void;
  disabled?: boolean;
}

function SetupFlow({
  needsPin,
  needsPassword,
  setupPin,
  setSetupPin,
  setupPinConfirm,
  setSetupPinConfirm,
  setupPassword,
  setSetupPassword,
  setupPasswordConfirm,
  setSetupPasswordConfirm,
  showPassword,
  setShowPassword,
  onSubmitPin,
  onSubmitPassword,
  disabled,
}: SetupFlowProps) {
  const [active, setActive] = React.useState<"pin" | "password">(
    needsPin ? "pin" : "password"
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="flex items-center justify-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {needsPin && needsPassword
            ? "Buat Keamanan"
            : needsPin
              ? "Buat PIN"
              : "Buat Password"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {active === "pin"
            ? "Buat PIN 4-6 digit untuk membuka aplikasi"
            : "Buat password untuk membuka aplikasi"}
        </p>
      </div>

      {needsPin && needsPassword && (
        <Tabs value={active} onValueChange={(v) => setActive(v as "pin" | "password")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pin">
              <Hash className="h-3.5 w-3.5" /> PIN
            </TabsTrigger>
            <TabsTrigger value="password">
              <KeyRound className="h-3.5 w-3.5" /> Password
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {active === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitPin();
          }}
          className="space-y-3"
        >
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={setupPin}
              onChange={setSetupPin}
              pattern={REGEXP_ONLY_DIGITS}
              disabled={disabled}
              autoFocus
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={setupPinConfirm}
              onChange={setSetupPinConfirm}
              pattern={REGEXP_ONLY_DIGITS}
              disabled={disabled}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Masukkan PIN 4-6 digit dua kali
          </p>
          <Button type="submit" className="w-full" disabled={disabled || setupPin.length < 4}>
            <Lock className="h-4 w-4" />
            Simpan &amp; Buka
          </Button>
        </form>
      )}

      {active === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitPassword();
          }}
          className="space-y-3"
        >
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              disabled={disabled}
              placeholder="Masukkan password baru"
              autoFocus
              className="pr-10"
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={setupPasswordConfirm}
              onChange={(e) => setSetupPasswordConfirm(e.target.value)}
              disabled={disabled}
              placeholder="Konfirmasi password"
              className="pr-10"
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Minimal 4 karakter, jangan gunakan password yang mudah ditebak
          </p>
          <Button type="submit" className="w-full" disabled={disabled || setupPassword.length < 4}>
            <Lock className="h-4 w-4" />
            Simpan &amp; Buka
          </Button>
        </form>
      )}
    </div>
  );
}

// --- Main LockScreen component -------------------------------------------

export function LockScreen({
  config,
  onUnlock,
  onDecoy,
  onPanic,
  onWipe,
  children,
}: LockScreenProps) {
  const store = useSecurityStore();
  const addTrustedDevice = useAddTrustedDevice();
  const { data: biometricCreds } = useBiometricList();

  const [method, setMethod] = React.useState<Method>("pin");
  const [pin, setPin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [verifying, setVerifying] = React.useState(false);
  const [splashVisible, setSplashVisible] = React.useState(false);
  const [biometricSupported, setBiometricSupported] = React.useState<boolean | null>(null);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [panicClicksDisplay, setPanicClicksDisplay] = React.useState(0);

  // Setup state
  const [setupPin, setSetupPin] = React.useState("");
  const [setupPinConfirm, setSetupPinConfirm] = React.useState("");
  const [setupPassword, setSetupPassword] = React.useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = React.useState("");

  // Panic gesture tracking (ref for hot path; state for display)
  const panicClicksRef = React.useRef(0);
  const panicTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = store.isLocked && !store.isDecoyMode;

  const needsSetupPin = config.pinEnabled && !store.pinHash;
  const needsSetupPassword = config.passwordEnabled && !store.passwordHash;
  const needsSetup = needsSetupPin || needsSetupPassword;

  const availableMethods: Method[] = React.useMemo(() => {
    const list: Method[] = [];
    if (config.pinEnabled) list.push("pin");
    if (config.passwordEnabled) list.push("password");
    if (config.patternEnabled) list.push("pattern");
    if (config.biometricEnabled) list.push("biometric");
    return list;
  }, [
    config.pinEnabled,
    config.passwordEnabled,
    config.patternEnabled,
    config.biometricEnabled,
  ]);

  // Pick a valid method when availability changes
  React.useEffect(() => {
    if (availableMethods.length === 0) return;
    setMethod((prev) =>
      availableMethods.includes(prev) ? prev : availableMethods[0]
    );
  }, [availableMethods]);

  // Countdown timer
  React.useEffect(() => {
    if (!store.lockedUntil) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = (store.lockedUntil ?? 0) - Date.now();
      setCountdown(remaining > 0 ? remaining : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [store.lockedUntil]);

  // Biometric support detection
  React.useEffect(() => {
    if (!config.biometricEnabled) {
      setBiometricSupported(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined" || !window.PublicKeyCredential) {
          if (!cancelled) setBiometricSupported(false);
          return;
        }
        const uvpa =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!cancelled) setBiometricSupported(uvpa);
      } catch {
        if (!cancelled) setBiometricSupported(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.biometricEnabled]);

  // Trusted device bypass check on mount
  React.useEffect(() => {
    if (!locked) return;
    if (!config.rememberDeviceDays || config.rememberDeviceDays <= 0) return;
    if (needsSetup) return;
    let cancelled = false;
    (async () => {
      try {
        const fp = await getDeviceFingerprint();
        const devices = await api.listTrustedDevices();
        if (cancelled) return;
        const match = devices.find((d) => d.fingerprint === fp);
        if (!match) return;
        const trustedUntilMs = new Date(match.trustedUntil).getTime();
        if (trustedUntilMs <= Date.now()) return;
        // Trusted — show splash, auto-unlock after brief delay
        setSplashVisible(true);
        await auditLog(
          AUDIT_ACTIONS.UNLOCK,
          `Trusted device bypass: ${match.name}`,
          true
        );
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        store.unlock();
        store.resetAttempts();
        setSplashVisible(false);
        onUnlock();
      } catch {
        setSplashVisible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount — bypass should not re-trigger on
    // every state change. The store and config are referenced via closures.
  }, []);

  const registerCurrentDevice = React.useCallback(async () => {
    if (!config.rememberDeviceDays || config.rememberDeviceDays <= 0) return;
    try {
      const fp = await getDeviceFingerprint();
      const name =
        typeof navigator !== "undefined"
          ? (navigator.userAgent.match(/\(([^)]+)\)/)?.[1]?.split(";")[0] ??
            "Perangkat Saya")
          : "Perangkat Saya";
      await addTrustedDevice.mutateAsync({
        name,
        fingerprint: fp,
        trustedDays: config.rememberDeviceDays,
      });
    } catch {
      // Non-critical — ignore
    }
  }, [config.rememberDeviceDays, addTrustedDevice]);

  // Panic gesture — 5 quick clicks on the logo within 1 second
  const handleLogoClick = React.useCallback(() => {
    if (!config.panicGestureEnabled) return;
    panicClicksRef.current += 1;
    setPanicClicksDisplay(panicClicksRef.current);
    if (panicTimerRef.current) clearTimeout(panicTimerRef.current);
    panicTimerRef.current = setTimeout(() => {
      panicClicksRef.current = 0;
      setPanicClicksDisplay(0);
    }, PANIC_CLICK_WINDOW_MS);

    if (panicClicksRef.current >= PANIC_CLICK_THRESHOLD) {
      panicClicksRef.current = 0;
      setPanicClicksDisplay(0);
      if (panicTimerRef.current) clearTimeout(panicTimerRef.current);
      auditLog(
        AUDIT_ACTIONS.LOCK,
        "Panic gesture (5x logo click) terdeteksi",
        true
      ).catch(() => {});
      toast.info("Panic gesture terpicu");
      if (onPanic) {
        onPanic();
      } else if (config.panicWipeEnabled && onWipe) {
        onWipe();
      } else {
        toast.warning("Sesi diperketat. Mohon tunggu sebelum mencoba lagi.");
      }
    }
  }, [config.panicGestureEnabled, config.panicWipeEnabled, onPanic, onWipe]);

  const handleFailedAttempt = React.useCallback(
    async (reason: string) => {
      const max = config.rateLimitMaxAttempts;
      const totalFails = store.failedAttempts + 1;
      const result = store.recordFailedAttempt(
        max,
        config.rateLockoutMinutes,
        config.exponentialBackoff
      );
      await auditLog(
        AUDIT_ACTIONS.LOCK,
        `Percobaan gagal ${totalFails}/${max}: ${reason}`,
        false
      ).catch(() => {});

      // Wipe threshold
      if (
        config.wipeAfterFailedAttempts > 0 &&
        totalFails >= config.wipeAfterFailedAttempts
      ) {
        await auditLog(
          AUDIT_ACTIONS.PANIC_WIPE,
          `Auto-wipe setelah ${totalFails} percobaan gagal`,
          true
        ).catch(() => {});
        toast.error("Ambang batas keamanan tercapai. Data akan dihapus.");
        if (onWipe) onWipe();
        return;
      }

      if (result.locked) {
        const mins = Math.max(
          1,
          Math.ceil(((result.lockedUntil ?? 0) - Date.now()) / 60000)
        );
        toast.error(`Terlalu banyak percobaan. Terkunci ~${mins} menit.`);
        await auditLog(
          AUDIT_ACTIONS.RATE_LIMIT_HIT,
          `Terkunci hingga ${new Date(result.lockedUntil ?? 0).toISOString()}`,
          true
        ).catch(() => {});
      } else {
        toast.error(`${reason}. Percobaan ${totalFails}/${max}.`);
      }

      setPin("");
      setPassword("");
    },
    [config, store, onWipe]
  );

  const handleSuccess = React.useCallback(
    async (methodLabel: string) => {
      await auditLog(
        AUDIT_ACTIONS.UNLOCK,
        `Berhasil via ${methodLabel}`,
        true
      ).catch(() => {});
      store.unlock();
      store.resetAttempts();
      await registerCurrentDevice();
      toast.success("Aplikasi terbuka");
      onUnlock();
    },
    [store, registerCurrentDevice, onUnlock]
  );

  // Duress PIN detection
  const checkDuress = React.useCallback(
    async (hash: string): Promise<boolean> => {
      if (!config.decoyEnabled) return false;
      const candidates = [config.duressPinHash, store.duressPinHash].filter(
        (v): v is string => Boolean(v && v.length > 0)
      );
      for (const cand of candidates) {
        if (constantTimeCompare(hash, cand)) {
          await auditLog(
            AUDIT_ACTIONS.DECOY_ACCESS,
            "Duress PIN terdeteksi — masuk mode decoy",
            true
          ).catch(() => {});
          store.enterDecoy();
          toast.success("Membuka mode decoy...");
          onDecoy();
          return true;
        }
      }
      return false;
    },
    [config.decoyEnabled, config.duressPinHash, store, onDecoy]
  );

  const verifyPin = React.useCallback(
    async (rawPin?: string) => {
      const value = (rawPin ?? pin).trim();
      if (!value || value.length < 4) {
        toast.error("PIN minimal 4 digit.");
        return;
      }
      if (countdown > 0) return;
      setVerifying(true);
      try {
        const hash = await hashSecret(value);
        if (await checkDuress(hash)) return;
        if (store.pinHash && constantTimeCompare(hash, store.pinHash)) {
          await handleSuccess("PIN");
        } else {
          await handleFailedAttempt("PIN salah");
        }
      } catch {
        toast.error("Gagal memverifikasi PIN. Coba lagi.");
      } finally {
        setVerifying(false);
      }
    },
    [pin, countdown, checkDuress, store.pinHash, handleSuccess, handleFailedAttempt]
  );

  const verifyPassword = React.useCallback(async () => {
    if (!password) {
      toast.error("Masukkan password.");
      return;
    }
    if (countdown > 0) return;
    setVerifying(true);
    try {
      const hash = await hashSecret(password);
      if (await checkDuress(hash)) return;
      if (store.passwordHash && constantTimeCompare(hash, store.passwordHash)) {
        await handleSuccess("Password");
      } else {
        await handleFailedAttempt("Password salah");
      }
    } catch {
      toast.error("Gagal memverifikasi password. Coba lagi.");
    } finally {
      setVerifying(false);
    }
  }, [password, countdown, checkDuress, store.passwordHash, handleSuccess, handleFailedAttempt]);

  const verifyPattern = React.useCallback(
    async (pattern: string) => {
      if (countdown > 0) return;
      setVerifying(true);
      try {
        const hash = await hashSecret(pattern);
        if (await checkDuress(hash)) return;
        // Pattern shares the PIN credential space
        if (store.pinHash && constantTimeCompare(hash, store.pinHash)) {
          await handleSuccess("Pattern");
        } else {
          await handleFailedAttempt("Pola salah");
        }
      } catch {
        toast.error("Gagal memverifikasi pola. Coba lagi.");
      } finally {
        setVerifying(false);
      }
    },
    [countdown, checkDuress, store.pinHash, handleSuccess, handleFailedAttempt]
  );

  const verifyBiometric = React.useCallback(async () => {
    if (countdown > 0) return;
    if (biometricSupported === false) {
      toast.error("Biometrik tidak didukung di perangkat ini.");
      return;
    }
    if (!biometricCreds || biometricCreds.length === 0) {
      toast.error("Belum ada kredensial biometrik terdaftar.");
      return;
    }
    setVerifying(true);
    try {
      const credentialIds = biometricCreds.map((c) => c.credentialId);
      const assertion = await requestBiometricAssertion(credentialIds);
      if (!assertion) {
        toast.error("Verifikasi biometrik dibatalkan.");
        return;
      }
      const result = await api.verifyBiometric(
        assertion.credentialId,
        assertion.counter
      );
      if (result?.verified) {
        await handleSuccess("Biometrik");
      } else {
        await handleFailedAttempt("Biometrik tidak valid");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Verifikasi biometrik gagal.";
      toast.error(msg);
      await handleFailedAttempt("Biometrik gagal");
    } finally {
      setVerifying(false);
    }
  }, [
    countdown,
    biometricSupported,
    biometricCreds,
    handleSuccess,
    handleFailedAttempt,
  ]);

  // Setup handlers
  const handleSetupPin = React.useCallback(async () => {
    if (setupPin.length < 4) {
      toast.error("PIN minimal 4 digit.");
      return;
    }
    if (setupPin !== setupPinConfirm) {
      toast.error("PIN tidak cocok. Coba lagi.");
      return;
    }
    try {
      const hash = await hashSecret(setupPin);
      store.setSecrets({ pinHash: hash });
      await auditLog(AUDIT_ACTIONS.PIN_CHANGE, "PIN baru dibuat", true).catch(
        () => {}
      );
      store.unlock();
      store.resetAttempts();
      await registerCurrentDevice();
      toast.success("PIN berhasil dibuat. Aplikasi terbuka.");
      onUnlock();
    } catch {
      toast.error("Gagal membuat PIN.");
    }
  }, [setupPin, setupPinConfirm, store, registerCurrentDevice, onUnlock]);

  const handleSetupPassword = React.useCallback(async () => {
    if (setupPassword.length < 4) {
      toast.error("Password minimal 4 karakter.");
      return;
    }
    if (setupPassword !== setupPasswordConfirm) {
      toast.error("Password tidak cocok. Coba lagi.");
      return;
    }
    try {
      const hash = await hashSecret(setupPassword);
      store.setSecrets({ passwordHash: hash });
      await auditLog(
        AUDIT_ACTIONS.PIN_CHANGE,
        "Password baru dibuat",
        true
      ).catch(() => {});
      store.unlock();
      store.resetAttempts();
      await registerCurrentDevice();
      toast.success("Password berhasil dibuat. Aplikasi terbuka.");
      onUnlock();
    } catch {
      toast.error("Gagal membuat password.");
    }
  }, [setupPassword, setupPasswordConfirm, store, registerCurrentDevice, onUnlock]);

  // Hide overlay if not locked
  if (!locked) {
    return <>{children ?? null}</>;
  }

  const inputDisabled = countdown > 0 || verifying || splashVisible;
  const maxAttempts = config.rateLimitMaxAttempts;
  const failedCount = store.failedAttempts;
  const failedPct = Math.min(100, (failedCount / Math.max(1, maxAttempts)) * 100);

  const gridColsClass =
    availableMethods.length === 1
      ? "grid-cols-1"
      : availableMethods.length === 2
        ? "grid-cols-2"
        : availableMethods.length === 3
          ? "grid-cols-3"
          : "grid-cols-4";

  return (
    <div className="relative min-h-screen">
      {children}
      <AnimatePresence>
        <motion.div
          key="lock-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-md"
        >
          {config.watermarkEnabled && config.watermarkText && (
            <Watermark text={config.watermarkText} />
          )}

          {/* Splash — trusted device bypass */}
          <AnimatePresence>
            {splashVisible && (
              <motion.div
                key="splash"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-md"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Membuka...</p>
                <p className="text-xs text-muted-foreground">
                  Perangkat terpercaya terdeteksi
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="relative z-[1] w-full max-w-sm gap-0 overflow-hidden border-border/60 p-0 shadow-2xl">
            {/* Logo header with emerald gradient */}
            <div className="relative flex flex-col items-center gap-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-5 pt-7 text-center">
              <button
                type="button"
                onClick={handleLogoClick}
                aria-label="Logo DompetKu"
                className="group relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 transition-transform active:scale-95"
              >
                <Wallet className="h-8 w-8 text-primary-foreground" />
                <span className="sr-only">DompetKu</span>
              </button>
              <div className="space-y-0.5">
                <h1 className="text-lg font-semibold tracking-tight">DompetKu</h1>
                <p className="text-xs text-muted-foreground">Keuangan Pribadi Aman</p>
              </div>
            </div>

            <CardContent className="space-y-4 px-6 pb-6">
              {needsSetup ? (
                <SetupFlow
                  needsPin={needsSetupPin}
                  needsPassword={needsSetupPassword}
                  setupPin={setupPin}
                  setSetupPin={setSetupPin}
                  setupPinConfirm={setupPinConfirm}
                  setSetupPinConfirm={setSetupPinConfirm}
                  setupPassword={setupPassword}
                  setSetupPassword={setSetupPassword}
                  setupPasswordConfirm={setupPasswordConfirm}
                  setSetupPasswordConfirm={setSetupPasswordConfirm}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  onSubmitPin={handleSetupPin}
                  onSubmitPassword={handleSetupPassword}
                  disabled={verifying}
                />
              ) : (
                <>
                  <div className="text-center">
                    <h2 className="flex items-center justify-center gap-2 text-base font-semibold">
                      <Lock className="h-4 w-4 text-primary" />
                      Aplikasi Terkunci
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Masukkan PIN/Password untuk membuka
                    </p>
                  </div>

                  {/* Failed attempts indicator */}
                  {failedCount > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Percobaan gagal
                        </span>
                        <Badge
                          variant={
                            failedCount >= maxAttempts - 1
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {failedCount}/{maxAttempts}
                        </Badge>
                      </div>
                      <Progress value={failedPct} className="h-1" />
                    </div>
                  )}

                  {/* Countdown overlay */}
                  {countdown > 0 && (
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                      <Timer className="h-5 w-5 text-amber-500" />
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Coba lagi dalam
                      </p>
                      <p className="font-mono text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-300">
                        {formatCountdown(countdown)}
                      </p>
                    </div>
                  )}

                  {/* Method tabs */}
                  {availableMethods.length > 0 ? (
                    <Tabs
                      value={method}
                      onValueChange={(v) => setMethod(v as Method)}
                      className="w-full"
                    >
                      {availableMethods.length > 1 && (
                        <TabsList className={cn("grid w-full", gridColsClass)}>
                          {config.pinEnabled && (
                            <TabsTrigger value="pin" disabled={inputDisabled}>
                              <Hash className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">PIN</span>
                            </TabsTrigger>
                          )}
                          {config.passwordEnabled && (
                            <TabsTrigger value="password" disabled={inputDisabled}>
                              <KeyRound className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Sandi</span>
                            </TabsTrigger>
                          )}
                          {config.patternEnabled && (
                            <TabsTrigger value="pattern" disabled={inputDisabled}>
                              <Grid3x3 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Pola</span>
                            </TabsTrigger>
                          )}
                          {config.biometricEnabled && (
                            <TabsTrigger value="biometric" disabled={inputDisabled}>
                              <Fingerprint className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Biometrik</span>
                            </TabsTrigger>
                          )}
                        </TabsList>
                      )}

                      {/* PIN */}
                      {config.pinEnabled && (
                        <TabsContent value="pin" className="mt-4 space-y-3">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              verifyPin();
                            }}
                            className="space-y-3"
                          >
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={6}
                                value={pin}
                                onChange={setPin}
                                pattern={REGEXP_ONLY_DIGITS}
                                disabled={inputDisabled}
                                onComplete={(v) => verifyPin(v)}
                                autoFocus
                                containerClassName="justify-center"
                              >
                                <InputOTPGroup>
                                  {Array.from({ length: 6 }).map((_, i) => (
                                    <InputOTPSlot
                                      key={i}
                                      index={i}
                                      className="h-12 w-10 text-lg"
                                    />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={inputDisabled || pin.length < 4}
                            >
                              {verifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                              Buka
                            </Button>
                          </form>
                        </TabsContent>
                      )}

                      {/* Password */}
                      {config.passwordEnabled && (
                        <TabsContent value="password" className="mt-4 space-y-3">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              verifyPassword();
                            }}
                            className="space-y-3"
                          >
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={inputDisabled}
                                placeholder="Masukkan password"
                                autoFocus
                                className="pr-10"
                                autoComplete="current-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-9 w-9"
                                onClick={() => setShowPassword((v) => !v)}
                                tabIndex={-1}
                                aria-label={
                                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                                }
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={inputDisabled || password.length < 1}
                            >
                              {verifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                              Buka
                            </Button>
                          </form>
                        </TabsContent>
                      )}

                      {/* Pattern */}
                      {config.patternEnabled && (
                        <TabsContent value="pattern" className="mt-4 space-y-3">
                          <div className="rounded-lg border bg-muted/20 p-3">
                            <PatternGrid
                              disabled={inputDisabled}
                              onComplete={verifyPattern}
                            />
                          </div>
                          <p className="text-center text-[11px] text-muted-foreground">
                            Hubungkan minimal 4 titik untuk membuat pola
                          </p>
                        </TabsContent>
                      )}

                      {/* Biometric */}
                      {config.biometricEnabled && (
                        <TabsContent value="biometric" className="mt-4 space-y-3">
                          <div className="flex flex-col items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="lg"
                              className="w-full"
                              disabled={
                                inputDisabled || biometricSupported === false
                              }
                              onClick={verifyBiometric}
                            >
                              {verifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Fingerprint className="h-5 w-5" />
                              )}
                              Gunakan Biometrik
                            </Button>
                            {biometricSupported === false && (
                              <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                Biometrik tidak didukung di perangkat ini
                              </p>
                            )}
                            {biometricSupported === true &&
                              (!biometricCreds || biometricCreds.length === 0) && (
                                <p className="text-xs text-muted-foreground">
                                  Belum ada kredensial biometrik terdaftar
                                </p>
                              )}
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  ) : (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                      <p className="text-sm font-medium">Tidak ada metode aktif</p>
                      <p className="text-xs text-muted-foreground">
                        Aktifkan minimal satu metode autentikasi di pengaturan.
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground"
                      onClick={() => setForgotOpen(true)}
                    >
                      <HelpCircle className="h-3 w-3" />
                      Lupa PIN?
                    </Button>
                    {config.rememberDeviceDays > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        Perangkat terpercaya aktif
                      </span>
                    )}
                  </div>

                  {/* Forgot PIN dialog */}
                  <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <HelpCircle className="h-5 w-5 text-primary" />
                          Lupa PIN/Password
                        </DialogTitle>
                        <DialogDescription>
                          Jika Anda lupa PIN atau password, gunakan salah satu
                          opsi pemulihan berikut:
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 text-sm">
                        <div className="rounded-md border p-3">
                          <p className="font-medium">1. Recovery Phrase</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Gunakan frasa pemulihan 12 kata yang Anda catat saat
                            pertama kali menyiapkan keamanan.
                          </p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="font-medium">2. Hubungi Admin</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Hubungi admin atau penyedia layanan untuk reset
                            manual kredensial Anda.
                          </p>
                        </div>
                        {config.rememberDeviceDays > 0 && (
                          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                            <p className="font-medium text-primary">
                              3. Perangkat Terpercaya
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Jika perangkat ini pernah ditandai terpercaya,
                              aplikasi akan terbuka otomatis saat dimulai.
                            </p>
                          </div>
                        )}
                        {config.recoveryPhraseEnabled && (
                          <div className="rounded-md border p-3">
                            <p className="font-medium">4. Hapus &amp; Buat Ulang</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Sebagai opsi terakhir, data lokal dapat dihapus dan
                              Anda dapat membuat kredensial baru.
                            </p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Mengerti</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>

            {/* Subtle panic-click indicator (hidden until first click) */}
            {config.panicGestureEnabled &&
              panicClicksDisplay > 0 &&
              panicClicksDisplay < PANIC_CLICK_THRESHOLD && (
                <div className="pointer-events-none absolute right-2 bottom-2 z-10">
                  <Badge
                    variant="outline"
                    className="border-transparent bg-muted/60 text-[9px] text-muted-foreground"
                  >
                    {panicClicksDisplay}/{PANIC_CLICK_THRESHOLD}
                  </Badge>
                </div>
              )}
          </Card>

          <p className="absolute right-0 bottom-3 left-0 text-center text-[10px] text-muted-foreground/60">
            DompetKu · Aman dengan enkripsi end-to-end
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default LockScreen;
