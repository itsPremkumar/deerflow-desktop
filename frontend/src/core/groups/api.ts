import { fetch } from "@/core/api/fetcher";
import { getBackendBaseURL } from "@/core/config";

import type {
  CreateRoomRequest,
  GroupMessage,
  GroupRoom,
  GroupRun,
  PostRoomMessageRequest,
  StartGroupRunRequest,
} from "./types";

async function errorDetail(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

export async function listRooms(): Promise<GroupRoom[]> {
  const res = await fetch(`${getBackendBaseURL()}/api/groups`);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load rooms"));
  const body = (await res.json()) as { rooms: GroupRoom[] };
  return body.rooms;
}

export async function createRoom(request: CreateRoomRequest): Promise<GroupRoom> {
  const res = await fetch(`${getBackendBaseURL()}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to create room"));
  return res.json() as Promise<GroupRoom>;
}

export async function getRoom(
  name: string,
  limit = 50,
): Promise<GroupRoom & { messages: GroupMessage[] }> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/groups/${encodeURIComponent(name)}?limit=${limit}`,
  );
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load room"));
  return res.json() as Promise<GroupRoom & { messages: GroupMessage[] }>;
}

export async function postRoomMessage(
  name: string,
  request: PostRoomMessageRequest,
): Promise<{ message: GroupMessage; next_speakers: string[] }> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/groups/${encodeURIComponent(name)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to post message"));
  return res.json() as Promise<{ message: GroupMessage; next_speakers: string[] }>;
}

export async function startGroupRun(
  name: string,
  request: StartGroupRunRequest,
): Promise<GroupRun> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/groups/${encodeURIComponent(name)}/runs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to start team run"));
  return res.json() as Promise<GroupRun>;
}

export async function listGroupRuns(name: string): Promise<GroupRun[]> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/groups/${encodeURIComponent(name)}/runs`,
  );
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to load team runs"));
  const body = (await res.json()) as { runs: GroupRun[] };
  return body.runs;
}

export async function getGroupRun(
  name: string,
  runId: string,
): Promise<GroupRun> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/groups/${encodeURIComponent(name)}/runs/${encodeURIComponent(runId)}`,
  );
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to load team run"));
  return res.json() as Promise<GroupRun>;
}

export async function cancelGroupRun(
  name: string,
  runId: string,
): Promise<void> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/groups/${encodeURIComponent(name)}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" },
  );
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to cancel team run"));
}
