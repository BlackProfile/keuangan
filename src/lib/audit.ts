"use client";

import { api } from "@/lib/api";
import { getDeviceFingerprint } from "@/lib/crypto";

/** Log a security event to the backend audit log */
export async function auditLog(
  action: string,
  detail?: string,
  success = true
): Promise<void> {
  try {
    const fingerprint = await getDeviceFingerprint();
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        detail,
        success,
        fingerprint,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      }),
    }).catch(() => {
      // fail silently — audit logging should not break UX
    });
  } catch {
    // ignore
  }
}

// Action constants
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  LOCK: "LOCK",
  UNLOCK: "UNLOCK",
  PIN_CHANGE: "PIN_CHANGE",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  DELETE_TX: "DELETE_TX",
  DELETE_ACCOUNT: "DELETE_ACCOUNT",
  SETTING_CHANGE: "SETTING_CHANGE",
  PANIC_WIPE: "PANIC_WIPE",
  DECOY_ACCESS: "DECOY_ACCESS",
  BIOMETRIC_REGISTER: "BIOMETRIC_REGISTER",
  BIOMETRIC_LOGIN: "BIOMETRIC_LOGIN",
  RATE_LIMIT_HIT: "RATE_LIMIT_HIT",
  TRUSTED_DEVICE_ADD: "TRUSTED_DEVICE_ADD",
  BACKUP_CREATE: "BACKUP_CREATE",
  RESTORE: "RESTORE",
} as const;
