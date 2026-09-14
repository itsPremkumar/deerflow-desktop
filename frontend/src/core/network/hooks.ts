"use client";

import { useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function snapshotOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Browser network state. SSR-safe (assumes online on the server).
 *
 * When offline, React Query's `offlineFirst` network mode pauses queries and
 * mutations instead of failing them, and `refetchOnReconnect` resumes on
 * restore — the UI pause/resume half of network recovery. Durable
 * Gateway-side work (scheduled tasks, MCP tasks, batches) is unaffected and
 * keeps running server-side.
 */
export function useBrowserOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, snapshotOnline, () => true);
}
