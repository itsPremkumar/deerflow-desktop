import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getConsoleStats, listConsoleRuns, resumeThreadRun } from "./api";

export const CONSOLE_STATS_QUERY_KEY = ["console", "stats"] as const;
export const CONSOLE_RUNS_QUERY_KEY = ["console", "runs"] as const;

export function useConsoleStats() {
  const query = useQuery({
    queryKey: CONSOLE_STATS_QUERY_KEY,
    queryFn: getConsoleStats,
    staleTime: 30_000,
    retry: false,
  });
  return { stats: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useConsoleRuns(limit = 8) {
  const query = useQuery({
    queryKey: [...CONSOLE_RUNS_QUERY_KEY, limit],
    queryFn: () => listConsoleRuns(limit),
    staleTime: 15_000,
    retry: false,
  });
  return { runs: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useResumeRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, runId }: { threadId: string; runId: string }) =>
      resumeThreadRun(threadId, runId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: CONSOLE_RUNS_QUERY_KEY });
      void client.invalidateQueries({ queryKey: CONSOLE_STATS_QUERY_KEY });
    },
  });
}
