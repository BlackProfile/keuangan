"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LockState {
  // Lock status
  isLocked: boolean;
  isDecoyMode: boolean;
  // Auth attempts
  failedAttempts: number;
  lockedUntil: number | null; // epoch ms
  // Session
  unlockedAt: number | null;
  lastActivity: number;
  // Methods set up
  pinHash: string | null;
  passwordHash: string | null;
  duressPinHash: string | null;
  // Re-auth in progress
  reauthPending: string | null; // action id awaiting reauth
  // Actions
  lock: () => void;
  unlock: () => void;
  enterDecoy: () => void;
  recordFailedAttempt: (maxAttempts: number, lockoutMin: number, exp: boolean) => {
    locked: boolean;
    lockedUntil: number | null;
    remaining: number;
    shouldWipe: boolean;
  };
  resetAttempts: () => void;
  canAttempt: () => boolean;
  touch: () => void;
  setSecrets: (s: {
    pinHash?: string | null;
    passwordHash?: string | null;
    duressPinHash?: string | null;
  }) => void;
  setReauthPending: (action: string | null) => void;
}

export const useSecurityStore = create<LockState>()(
  persist(
    (set, get) => ({
      isLocked: false,
      isDecoyMode: false,
      failedAttempts: 0,
      lockedUntil: null,
      unlockedAt: null,
      lastActivity: Date.now(),
      pinHash: null,
      passwordHash: null,
      duressPinHash: null,
      reauthPending: null,

      lock: () =>
        set({ isLocked: true, unlockedAt: null, isDecoyMode: false }),

      unlock: () =>
        set({
          isLocked: false,
          unlockedAt: Date.now(),
          lastActivity: Date.now(),
          failedAttempts: 0,
          lockedUntil: null,
          isDecoyMode: false,
        }),

      enterDecoy: () =>
        set({
          isLocked: false,
          isDecoyMode: true,
          failedAttempts: 0,
          lockedUntil: null,
          unlockedAt: Date.now(),
        }),

      recordFailedAttempt: (maxAttempts, lockoutMin, exp) => {
        const state = get();
        const next = state.failedAttempts + 1;
        const remaining = Math.max(0, maxAttempts - next);
        const shouldWipe = false; // handled by caller based on config
        if (next >= maxAttempts) {
          let lockoutMs = lockoutMin * 60_000;
          if (exp) {
            // exponential: 30s, 1m, 5m, 15m based on next
            const steps = [30_000, 60_000, 300_000, 900_000, 1_800_000];
            const idx = Math.min(next - maxAttempts, steps.length - 1);
            lockoutMs = steps[Math.max(0, idx)];
          }
          set({
            failedAttempts: next,
            lockedUntil: Date.now() + lockoutMs,
          });
          return { locked: true, lockedUntil: Date.now() + lockoutMs, remaining: 0, shouldWipe };
        }
        set({ failedAttempts: next });
        return { locked: false, lockedUntil: null, remaining, shouldWipe };
      },

      resetAttempts: () => set({ failedAttempts: 0, lockedUntil: null }),

      canAttempt: () => {
        const { lockedUntil } = get();
        if (!lockedUntil) return true;
        return Date.now() >= lockedUntil;
      },

      touch: () => set({ lastActivity: Date.now() }),

      setSecrets: (s) =>
        set((state) => ({
          pinHash: s.pinHash !== undefined ? s.pinHash : state.pinHash,
          passwordHash:
            s.passwordHash !== undefined ? s.passwordHash : state.passwordHash,
          duressPinHash:
            s.duressPinHash !== undefined
              ? s.duressPinHash
              : state.duressPinHash,
        })),

      setReauthPending: (action) => set({ reauthPending: action }),
    }),
    {
      name: "dompetku-security",
      partialize: (state) => ({
        pinHash: state.pinHash,
        passwordHash: state.passwordHash,
        duressPinHash: state.duressPinHash,
        // Don't persist transient lock state
      }),
    }
  )
);
