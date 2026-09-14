import { fetch } from "@/core/api/fetcher";
import { getBackendBaseURL } from "@/core/config";

import type {
  Bot,
  BotStatus,
  BotTemplate,
  CloneBotRequest,
  EnsureBotRequest,
  UpdateBotRequest,
} from "./types";

async function errorDetail(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

export async function listBots(status?: BotStatus): Promise<Bot[]> {
  const url =
    status != null
      ? `${getBackendBaseURL()}/api/bots?status=${encodeURIComponent(status)}`
      : `${getBackendBaseURL()}/api/bots`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load bots"));
  const body = (await res.json()) as { bots: Bot[] };
  return body.bots;
}

export async function listBotTemplates(): Promise<BotTemplate[]> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/templates`);
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to load bot templates"));
  const body = (await res.json()) as { templates: BotTemplate[] };
  return body.templates;
}

export async function getBot(name: string): Promise<Bot> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/bots/${encodeURIComponent(name)}`,
  );
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load bot"));
  return res.json() as Promise<Bot>;
}

export async function ensureBot(
  name: string,
  request: EnsureBotRequest = {},
): Promise<Bot> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/bots/${encodeURIComponent(name)}/ensure`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to ensure bot"));
  return res.json() as Promise<Bot>;
}

export async function updateBot(
  name: string,
  request: UpdateBotRequest,
): Promise<Bot> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/bots/${encodeURIComponent(name)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to update bot"));
  return res.json() as Promise<Bot>;
}

export async function cloneBot(
  name: string,
  request: CloneBotRequest,
): Promise<Bot> {
  const res = await fetch(
    `${getBackendBaseURL()}/api/bots/${encodeURIComponent(name)}/clone`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to clone bot"));
  return res.json() as Promise<Bot>;
}

export async function getFleetHealth(): Promise<import("./types").FleetHealthOverview> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/health/overview`);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load fleet health"));
  return res.json();
}

export async function getOrgChart(): Promise<import("./types").OrganizationChart> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/organization-chart`);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load organization chart"));
  return res.json();
}

export async function getKillSwitch(): Promise<import("./types").KillSwitchStatus> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/kill-switch`);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to check kill switch"));
  return res.json();
}

export async function setKillSwitch(active: boolean, reason?: string): Promise<import("./types").KillSwitchStatus> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/kill-switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active, reason: reason || "Operator toggle" }),
  });
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to update kill switch"));
  return res.json();
}

export async function pauseBot(name: string, reason?: string): Promise<{ bot_name: string; is_paused: boolean }> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/${encodeURIComponent(name)}/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "Operator paused" }),
  });
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to pause bot"));
  return res.json();
}

export async function resumeBot(name: string): Promise<{ bot_name: string; is_paused: boolean }> {
  const res = await fetch(`${getBackendBaseURL()}/api/bots/${encodeURIComponent(name)}/resume`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to resume bot"));
  return res.json();
}
