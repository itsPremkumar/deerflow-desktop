import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelGroupRun,
  createRoom,
  getGroupRun,
  getRoom,
  listGroupRuns,
  listRooms,
  postRoomMessage,
  startGroupRun,
} from "./api";
import type {
  CreateRoomRequest,
  PostRoomMessageRequest,
  StartGroupRunRequest,
} from "./types";

export const GROUPS_QUERY_KEY = ["groups"] as const;
export const groupRoomQueryKey = (name: string) => ["groups", name] as const;
export const groupRunsQueryKey = (name: string) =>
  ["groups", name, "runs"] as const;

export function useGroupRooms() {
  const query = useQuery({
    queryKey: GROUPS_QUERY_KEY,
    queryFn: listRooms,
    staleTime: 15_000,
    retry: false,
  });
  return {
    rooms: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useGroupRoom(name: string | null) {
  const query = useQuery({
    queryKey: name ? groupRoomQueryKey(name) : GROUPS_QUERY_KEY,
    queryFn: () => getRoom(name!),
    enabled: Boolean(name),
    staleTime: 10_000,
    retry: false,
  });
  return {
    room: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCreateRoom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateRoomRequest) => createRoom(request),
    onSuccess: () => client.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }),
  });
}

export function usePostRoomMessage(roomName: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: PostRoomMessageRequest) =>
      postRoomMessage(roomName, request),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: groupRoomQueryKey(roomName) });
      void client.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
}

export function useGroupRuns(roomName: string | null) {
  const query = useQuery({
    queryKey: roomName ? groupRunsQueryKey(roomName) : GROUPS_QUERY_KEY,
    queryFn: () => listGroupRuns(roomName!),
    enabled: Boolean(roomName),
    staleTime: 5_000,
    // While a run is active, refresh so member results stream in hands-off.
    refetchInterval: (query) => {
      const runs = query.state.data ?? [];
      return runs.some((run) => run.status === "running") ? 5_000 : false;
    },
    retry: false,
  });
  return {
    runs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useGroupRun(roomName: string | null, runId: string | null) {
  const query = useQuery({
    queryKey:
      roomName && runId
        ? [...groupRunsQueryKey(roomName), runId]
        : GROUPS_QUERY_KEY,
    queryFn: () => getGroupRun(roomName!, runId!),
    enabled: Boolean(roomName && runId),
    staleTime: 3_000,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3_000 : false,
    retry: false,
  });
  return {
    run: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useStartGroupRun(roomName: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: StartGroupRunRequest) =>
      startGroupRun(roomName, request),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: groupRunsQueryKey(roomName),
      });
      void client.invalidateQueries({ queryKey: groupRoomQueryKey(roomName) });
    },
  });
}

export function useCancelGroupRun(roomName: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => cancelGroupRun(roomName, runId),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: groupRunsQueryKey(roomName),
      });
    },
  });
}
