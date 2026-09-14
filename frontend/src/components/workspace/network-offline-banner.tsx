"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useBrowserOnline } from "@/core/network";

/**
 * Browser-offline banner: the network disappeared after load. Complements
 * GatewayOfflineBanner (which covers Gateway-down with the network up).
 * Mounted in WorkspaceContent; renders nothing while online.
 */
export function NetworkOfflineBanner() {
  const { t } = useI18n();
  const online = useBrowserOnline();
  if (online) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <span>{t.workspace.networkOffline}</span>
      <span className="text-xs opacity-75">{t.workspace.networkOfflineResume}</span>
    </div>
  );
}
