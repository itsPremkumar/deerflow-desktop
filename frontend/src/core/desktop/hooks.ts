"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAutoStart, isDesktopApp, setAutoStart } from "./api";

export const AUTO_START_QUERY_KEY = ["desktop", "auto-start"] as const;

export function useDesktopApp(): boolean {
  return isDesktopApp();
}

export function useAutoStart() {
  const query = useQuery({
    queryKey: AUTO_START_QUERY_KEY,
    queryFn: getAutoStart,
    enabled: isDesktopApp(),
    staleTime: 30_000,
    retry: false,
  });
  return {
    state: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSetAutoStart() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setAutoStart(enabled),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: AUTO_START_QUERY_KEY });
    },
  });
}
