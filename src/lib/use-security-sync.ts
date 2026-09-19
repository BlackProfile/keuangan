"use client";

import * as React from "react";
import { useSecurityStore } from "@/lib/security-store";
import { useSecuritySettings } from "@/lib/hooks";

/**
 * Sync security secrets (pinHash, passwordHash, duressPinHash) from the
 * SERVER to the local security store. This ensures all devices accessing
 * the same instance share the same lock credentials.
 *
 * The hashes are stored in the SecuritySetting table on the server.
 * On app load, we fetch them and populate the zustand store so the
 * LockScreen can verify against the server-provided hashes.
 *
 * Local localStorage is only used as a cache; the server is the source
 * of truth.
 */
export function useSecuritySync() {
  const { data: serverSettings, isLoading } = useSecuritySettings();
  const setSecrets = useSecurityStore((s) => s.setSecrets);
  const localPinHash = useSecurityStore((s) => s.pinHash);
  const syncedRef = React.useRef(false);

  React.useEffect(() => {
    if (!serverSettings || syncedRef.current) return;

    const serverPinHash = serverSettings.pinHash ?? null;
    const serverPasswordHash = serverSettings.passwordHash ?? null;
    const serverDuressHash = serverSettings.duressPinHash ?? null;

    // Only update local store if server has different values
    // This syncs from server → local on every device
    if (
      serverPinHash !== localPinHash ||
      serverPasswordHash !== useSecurityStore.getState().passwordHash ||
      serverDuressHash !== useSecurityStore.getState().duressPinHash
    ) {
      setSecrets({
        pinHash: serverPinHash,
        passwordHash: serverPasswordHash,
        duressPinHash: serverDuressHash,
      });
    }
    syncedRef.current = true;
  }, [serverSettings, localPinHash, setSecrets]);

  return { isLoading };
}
