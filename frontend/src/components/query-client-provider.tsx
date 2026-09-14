"use client";

import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";

// Production-grade defaults: avoid retry storms on auth/client errors and
// login/Gateway-offline hangs. 4xx (except 429) never retries; transient
// network/5xx retries twice with backoff; no refetch on window focus to avoid
// surprise load after sleep; 30s stale / 5min GC bounds memory.
// `offlineFirst` pauses queries and mutations while the browser reports
// offline instead of failing them, and `refetchOnReconnect` resumes on
// restore — the client half of network recovery (server-side durable work is
// unaffected by design).
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        if (error instanceof Response) return isRetryableStatus(error.status);
        const status = (error as { status?: unknown })?.status;
        if (typeof status === "number") return isRetryableStatus(status);
        // Unknown/network errors are retryable (up to the count above).
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: false,
      networkMode: "offlineFirst",
    },
  },
});

export function QueryClientProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}
