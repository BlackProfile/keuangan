"use client";

import * as React from "react";
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
} from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Realtime: data stays fresh for 30s, then background refetch
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // CRITICAL: keep previous data during refetch → no flicker
            placeholderData: keepPreviousData,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
          mutations: {
            // Retry mutations on transient failure
            retry: 1,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
