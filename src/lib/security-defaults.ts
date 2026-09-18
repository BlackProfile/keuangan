// Security defaults — configurable per-user via SecuritySettings
export interface SecurityConfig {
  // Lock
  pinEnabled: boolean;
  passwordEnabled: boolean;
  biometricEnabled: boolean;
  patternEnabled: boolean;
  // Auto-lock
  autoLockEnabled: boolean;
  autoLockMinutes: number; // idle minutes before lock
  lockOnTabSwitch: boolean;
  lockOnAppClose: boolean;
  // Rate limit
  rateLimitMaxAttempts: number; // max failed PIN attempts
  rateLockoutMinutes: number; // lockout duration after max attempts
  exponentialBackoff: boolean;
  // Re-auth for sensitive
  reauthForDelete: boolean;
  reauthForExport: boolean;
  reauthForSettings: boolean;
  reauthForAccountDelete: boolean;
  // Privacy
  hiddenAmounts: boolean;
  hideSensitiveCategories: boolean;
  hiddenCategoryIds: string; // comma-separated
  hiddenAccountIds: string; // comma-separated
  blurOnBackground: boolean;
  blurOnMinimize: boolean;
  preventScreenCapture: boolean;
  clearClipboardSeconds: number; // 0 = disabled
  disableTextSelection: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  // Decoy / Duress
  decoyEnabled: boolean;
  duressPinHash: string; // empty = not set
  panicGestureEnabled: boolean; // 5x logo click
  // Session
  sessionExpiryMinutes: number; // 0 = never
  singleDeviceSession: boolean;
  rememberDeviceDays: number; // 0 = disabled
  // Network (server-side enforcement via middleware)
  localOnlyMode: boolean;
  ipWhitelist: string; // comma-separated CIDR/IPs
  blockTor: boolean;
  // Audit
  auditLogEnabled: boolean;
  failedAttemptAlert: boolean;
  newDeviceAlert: boolean;
  // Encryption
  encryptDatabase: boolean;
  encryptBackups: boolean;
  encryptExports: boolean;
  // Backup
  autoBackupEnabled: boolean;
  autoBackupIntervalDays: number;
  recoveryPhraseEnabled: boolean;
  // Wipe
  wipeAfterFailedAttempts: number; // 0 = disabled
  panicWipeEnabled: boolean;
  // Hardening
  disableDevTools: boolean;
  // Notifications
  reminderEnabled: boolean;
  reminderHour: number;
  theme: "light" | "dark" | "system";
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  pinEnabled: false,
  passwordEnabled: false,
  biometricEnabled: false,
  patternEnabled: false,
  autoLockEnabled: true,
  autoLockMinutes: 5,
  lockOnTabSwitch: false,
  lockOnAppClose: true,
  rateLimitMaxAttempts: 5,
  rateLockoutMinutes: 5,
  exponentialBackoff: true,
  reauthForDelete: false,
  reauthForExport: true,
  reauthForSettings: false,
  reauthForAccountDelete: true,
  hiddenAmounts: false,
  hideSensitiveCategories: false,
  hiddenCategoryIds: "",
  hiddenAccountIds: "",
  blurOnBackground: true,
  blurOnMinimize: true,
  preventScreenCapture: false,
  clearClipboardSeconds: 0,
  disableTextSelection: false,
  watermarkEnabled: false,
  watermarkText: "Pribadi",
  decoyEnabled: false,
  duressPinHash: "",
  panicGestureEnabled: true,
  sessionExpiryMinutes: 60,
  singleDeviceSession: false,
  rememberDeviceDays: 0,
  localOnlyMode: false,
  ipWhitelist: "",
  blockTor: false,
  auditLogEnabled: true,
  failedAttemptAlert: true,
  newDeviceAlert: true,
  encryptDatabase: false,
  encryptBackups: true,
  encryptExports: false,
  autoBackupEnabled: false,
  autoBackupIntervalDays: 7,
  recoveryPhraseEnabled: false,
  wipeAfterFailedAttempts: 0,
  panicWipeEnabled: false,
  disableDevTools: false,
  reminderEnabled: false,
  reminderHour: 20,
  theme: "light",
};

// Keys for SecuritySetting table
export const SECURITY_KEYS = Object.keys(DEFAULT_SECURITY_CONFIG) as Array<
  keyof SecurityConfig
>;

// Helper to parse stored config (values are strings in DB)
export function parseSecurityConfig(
  stored: Record<string, string>
): SecurityConfig {
  const config = { ...DEFAULT_SECURITY_CONFIG };
  for (const key of SECURITY_KEYS) {
    if (key in stored) {
      const raw = stored[key];
      const defaultVal = DEFAULT_SECURITY_CONFIG[key];
      if (typeof defaultVal === "boolean") {
        (config as Record<string, unknown>)[key] = raw === "true";
      } else if (typeof defaultVal === "number") {
        const n = Number(raw);
        if (Number.isFinite(n)) (config as Record<string, unknown>)[key] = n;
      } else {
        (config as Record<string, unknown>)[key] = raw;
      }
    }
  }
  // theme special handling
  if (config.theme !== "light" && config.theme !== "dark" && config.theme !== "system") {
    config.theme = "light";
  }
  return config;
}

// Serialize config to string map for storage
export function serializeSecurityConfig(
  config: SecurityConfig
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SECURITY_KEYS) {
    out[key] = String(config[key]);
  }
  return out;
}
