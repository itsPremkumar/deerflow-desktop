import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cloneBot,
  ensureBot,
  getFleetHealth,
  getKillSwitch,
  getOrgChart,
  listBotTemplates,
  listBots,
  pauseBot,
  resumeBot,
  setKillSwitch,
  updateBot,
} from "./api";
import type {
  BotStatus,
  CloneBotRequest,
  EnsureBotRequest,
  UpdateBotRequest,
} from "./types";

export const BOTS_QUERY_KEY = ["bots"] as const;
export const FLEET_HEALTH_QUERY_KEY = ["bots", "health"] as const;
export const ORG_CHART_QUERY_KEY = ["bots", "org-chart"] as const;
export const KILL_SWITCH_QUERY_KEY = ["bots", "kill-switch"] as const;

export function useBots(status?: BotStatus) {
  const query = useQuery({
    queryKey: status ? [...BOTS_QUERY_KEY, status] : BOTS_QUERY_KEY,
    queryFn: () => listBots(status),
    staleTime: 30_000,
    retry: false,
  });
  return {
    bots: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useEnsureBot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, request }: { name: string; request: EnsureBotRequest }) =>
      ensureBot(name, request),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: BOTS_QUERY_KEY });
      client.invalidateQueries({ queryKey: FLEET_HEALTH_QUERY_KEY });
    },
  });
}

export function useUpdateBot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, request }: { name: string; request: UpdateBotRequest }) =>
      updateBot(name, request),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: BOTS_QUERY_KEY });
      client.invalidateQueries({ queryKey: FLEET_HEALTH_QUERY_KEY });
    },
  });
}

export function useBotTemplates() {
  const query = useQuery({
    queryKey: [...BOTS_QUERY_KEY, "templates"],
    queryFn: listBotTemplates,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCloneBot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, request }: { name: string; request: CloneBotRequest }) =>
      cloneBot(name, request),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: BOTS_QUERY_KEY });
      client.invalidateQueries({ queryKey: FLEET_HEALTH_QUERY_KEY });
    },
  });
}

export function useFleetHealth() {
  const query = useQuery({
    queryKey: FLEET_HEALTH_QUERY_KEY,
    queryFn: getFleetHealth,
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: false,
  });
  return {
    health: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useOrgChart() {
  const query = useQuery({
    queryKey: ORG_CHART_QUERY_KEY,
    queryFn: getOrgChart,
    staleTime: 30_000,
    retry: false,
  });
  return {
    chart: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useKillSwitch() {
  const query = useQuery({
    queryKey: KILL_SWITCH_QUERY_KEY,
    queryFn: getKillSwitch,
    refetchInterval: 5_000,
    staleTime: 3_000,
    retry: false,
  });
  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSetKillSwitch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ active, reason }: { active: boolean; reason?: string }) =>
      setKillSwitch(active, reason),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: KILL_SWITCH_QUERY_KEY });
      client.invalidateQueries({ queryKey: FLEET_HEALTH_QUERY_KEY });
    },
  });
}

export function usePauseBot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, reason }: { name: string; reason?: string }) =>
      pauseBot(name, reason),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: KILL_SWITCH_QUERY_KEY });
      client.invalidateQueries({ queryKey: FLEET_HEALTH_QUERY_KEY });
      client.invalidateQueries({ queryKey: BOTS_QUERY_KEY });
    },
  });
}

export function useResumeBot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => resumeBot(name),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: KILL_SWITCH_QUERY_KEY });
      client.invalidateQueries({ queryKey: FLEET_HEALTH_QUERY_KEY });
      client.invalidateQueries({ queryKey: BOTS_QUERY_KEY });
    },
  });
}
