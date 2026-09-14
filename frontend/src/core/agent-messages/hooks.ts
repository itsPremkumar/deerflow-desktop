import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAgentInbox,
  listAgentRoster,
  registerAgent,
  sendAgentMessage,
} from "./api";
import type { DeliveryMode, MessageKind } from "./types";

export const agentRosterQueryKey = (threadId: string) =>
  ["threads", threadId, "agent-roster"] as const;
export const agentInboxQueryKey = (threadId: string, agentName: string) =>
  ["threads", threadId, "agent-inbox", agentName] as const;

export function useAgentRoster(threadId: string | null) {
  const query = useQuery({
    queryKey: threadId ? agentRosterQueryKey(threadId) : ["agent-roster"],
    queryFn: () => listAgentRoster(threadId!),
    enabled: Boolean(threadId),
    staleTime: 10_000,
    retry: false,
  });
  return {
    agents: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useAgentInbox(threadId: string | null, agentName: string | null) {
  const query = useQuery({
    queryKey:
      threadId && agentName
        ? agentInboxQueryKey(threadId, agentName)
        : ["agent-inbox"],
    queryFn: () => getAgentInbox(threadId!, agentName!),
    enabled: Boolean(threadId && agentName),
    staleTime: 5_000,
    refetchInterval: 10_000,
    retry: false,
  });
  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSendAgentMessage(threadId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: {
      sender_name: string;
      receiver_name: string;
      content: string;
      mode?: DeliveryMode;
      kind?: MessageKind;
    }) => sendAgentMessage(threadId, request),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: agentRosterQueryKey(threadId) });
    },
  });
}

export function useRegisterAgent(threadId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: { name: string; role?: string; status?: string }) =>
      registerAgent(threadId, request),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: agentRosterQueryKey(threadId) });
    },
  });
}
