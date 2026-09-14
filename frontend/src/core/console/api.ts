import { fetch } from "@/core/api/fetcher";
import { getBackendBaseURL } from "@/core/config";

import type { ConsoleRunItem, ConsoleStats, ResumedRun } from "./types";

export const RESUMABLE_RUN_STATUSES: ReadonlySet<string> = new Set([
  "error",
  "timeout",
  "interrupted",
]);

/**
 * Headline counters. Returns null when the deployment cannot serve them
 * (memory database backend answers 503) so the dashboard degrades to the
 * remaining cards instead of erroring the whole page.
 */
export async function getConsoleStats(): Promise<ConsoleStats | null> {
  const res = await fetch(`${getBackendBaseURL()}/api/console/stats`);
  if (res.status === 503) return null;
  if (!res.ok) throw new Error("Failed to load console stats");
  return res.json() as Promise<ConsoleStats>;
}

export async function listConsoleRuns(limit = 8): Promise<ConsoleRunItem[]> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/console/runs?limit=${limit}`,
  );
  if (res.status === 503) return [];
  if (!res.ok) throw new Error("Failed to load console runs");
  const body = (await res.json()) as { runs: ConsoleRunItem[] };
  return body.runs ?? [];
}

/**
 * Continue an interrupted run from the thread head checkpoint. The Gateway
 * answers 202 with the new run; 404/409 carry the reason in `detail`
 * (unknown run, still active, already completed, thread advanced, or no
 * resumable checkpoint).
 */
export async function resumeThreadRun(
  threadId: string,
  runId: string,
): Promise<ResumedRun> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}/resume`,
    { method: "POST" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
    throw new Error(
      typeof body.detail === "string" ? body.detail : "Failed to resume run",
    );
  }
  return res.json() as Promise<ResumedRun>;
}
