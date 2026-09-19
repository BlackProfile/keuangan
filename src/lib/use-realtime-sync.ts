"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Realtime sync hook — connects to the socket.io server (port 3003 via
 * Caddy gateway) and invalidates React Query caches when entities change.
 *
 * No flicker because:
 * - React Query keeps previous data during refetch (placeholderData: keepPreviousData)
 * - We only invalidate (not remove) so the UI stays showing old data until new arrives
 * - Socket events trigger refetch in the background
 */

let socket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
  }
  // Connect to socket.io server via Caddy gateway.
  // For dev (localhost:3000), connect directly to the socket.io server.
  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const url = isDev
    ? "http://localhost:3003"
    : `${window.location.origin}/?XTransformPort=3003`;
  console.log("[realtime] connecting to", url);
  socket = io(url, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });
  return socket;
}

const ENTITY_TO_QUERY_KEYS: Record<string, string[]> = {
  transaction: ["transactions"],
  account: ["accounts"],
  budget: ["budgets"],
  goal: ["goals"],
  category: ["categories"],
  recurring: ["recurring"],
  debt: ["debts"],
  template: ["templates"],
  share: ["shares"],
  setting: ["security"],
  audit: ["audit"],
  group: ["transaction-groups"],
  tag: ["tags"],
};

export function useRealtimeSync() {
  const qc = useQueryClient();
  const qcRef = React.useRef(qc);
  React.useEffect(() => {
    qcRef.current = qc;
  }, [qc]);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const s = getSocket();
    const handlers: Array<{ event: string; fn: (...args: unknown[]) => void }> = [];

    // Register handlers for each entity type
    for (const [entity, queryKeyPrefix] of Object.entries(
      ENTITY_TO_QUERY_KEYS
    )) {
      const handler = (data: unknown) => {
        const q = qcRef.current;
        // Invalidate all queries that start with this prefix (silent refetch)
        q.invalidateQueries({
          queryKey: queryKeyPrefix,
          refetchType: "active",
        });
        // Also invalidate dashboard + analytics (they aggregate)
        q.invalidateQueries({ queryKey: ["dashboard"] });
        q.invalidateQueries({ queryKey: ["analytics"] });
        if (entity === "transaction") {
          q.invalidateQueries({ queryKey: ["budgets", "statuses"] });
        }
        void data;
      };
      s.on(`${entity}:changed`, handler as (...args: unknown[]) => void);
      handlers.push({ event: `${entity}:changed`, fn: handler });
    }

    // Connection status
    const onConnect = () => {
      console.log("%c[realtime] ✓ connected", "color:#10b981;font-weight:bold");
    };
    const onDisconnect = (reason: unknown) => {
      console.warn("[realtime] disconnected:", reason);
    };
    const onConnectError = (err: unknown) => {
      console.warn("[realtime] connect error:", err);
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    // Note: we intentionally never disconnect — socket stays alive for the
    // entire session so realtime updates keep flowing across re-renders.
  }, []);

  return { broadcastChange };
}

/** Broadcast an entity change to all connected clients (call from API/mutations) */
export function broadcastChange(entity: string, action: string, id?: string) {
  try {
    const s = getSocket();
    if (s.connected) {
      s.emit("entity:changed", { entity, action, id });
    }
  } catch {
    // ignore
  }
}

// Helper to get a broadcaster that's stable
function s_getBroadcast() {
  return { broadcastChange };
}

/** Connect to realtime and listen for security lock events */
export function useSecurityLockSync(onLock: (reason?: string) => void) {
  React.useEffect(() => {
    const s = getSocket();
    const lockHandler = (data: { reason?: string }) => {
      onLock(data.reason);
    };
    s.on("security:lock", lockHandler);
    return () => {
      s.off("security:lock", lockHandler);
    };
  }, [onLock]);
}

/** Broadcast lock event to other devices */
export function broadcastLock(reason?: string) {
  try {
    const s = getSocket();
    if (s.connected) s.emit("security:lock", { reason });
  } catch {
    // ignore
  }
}

/** Broadcast unlock event */
export function broadcastUnlock() {
  try {
    const s = getSocket();
    if (s.connected) s.emit("security:unlock", {});
  } catch {
    // ignore
  }
}
