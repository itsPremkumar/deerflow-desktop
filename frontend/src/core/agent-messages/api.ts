import { fetch } from "@/core/api/fetcher";
import { getBackendBaseURL } from "@/core/config";

import type {
  AgentDescriptor,
  DeliveryMode,
  InterAgentMessage,
  MessageKind,
} from "./types";

function threadBase(threadId: string): string {
  return `${getBackendBaseURL()}/api/threads/${encodeURIComponent(threadId)}/agent-messages`;
}

async function errorDetail(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

export async function listAgentRoster(
  threadId: string,
): Promise<AgentDescriptor[]> {
  const res = await fetch(`${threadBase(threadId)}/roster`);
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to load agent roster"));
  const body = (await res.json()) as { agents: AgentDescriptor[] };
  return body.agents;
}

export async function registerAgent(
  threadId: string,
  request: { name: string; role?: string; status?: string },
): Promise<AgentDescriptor> {
  const res = await fetch(`${threadBase(threadId)}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to register agent"));
  return res.json() as Promise<AgentDescriptor>;
}

export async function sendAgentMessage(
  threadId: string,
  request: {
    sender_name: string;
    receiver_name: string;
    content: string;
    mode?: DeliveryMode;
    kind?: MessageKind;
  },
): Promise<{ receipts: Array<Record<string, unknown>> }> {
  const res = await fetch(`${threadBase(threadId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to send agent message"));
  return res.json() as Promise<{ receipts: Array<Record<string, unknown>> }>;
}

export async function getAgentInbox(
  threadId: string,
  agentName: string,
): Promise<InterAgentMessage[]> {
  const res = await fetch(
    `${threadBase(threadId)}/inbox?agent_name=${encodeURIComponent(agentName)}`,
  );
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to load agent inbox"));
  const body = (await res.json()) as { messages: InterAgentMessage[] };
  return body.messages;
}
