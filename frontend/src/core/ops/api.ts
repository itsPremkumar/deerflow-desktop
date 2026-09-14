import { fetch } from "@/core/api/fetcher";
import { getBackendBaseURL } from "@/core/config";

import type { OpsResources, OpsStatus, OpsVersion } from "./types";

async function errorDetail(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

export async function getOpsStatus(): Promise<OpsStatus> {
  const res = await fetch(`${getBackendBaseURL()}/api/ops/status`);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load status"));
  return res.json() as Promise<OpsStatus>;
}

export async function getOpsVersion(): Promise<OpsVersion> {
  const res = await fetch(`${getBackendBaseURL()}/api/ops/version`);
  if (!res.ok) throw new Error(await errorDetail(res, "Failed to load version"));
  return res.json() as Promise<OpsVersion>;
}

export async function getOpsResources(): Promise<OpsResources> {
  const res = await fetch(`${getBackendBaseURL()}/api/ops/resources`);
  if (!res.ok)
    throw new Error(await errorDetail(res, "Failed to load resources"));
  return res.json() as Promise<OpsResources>;
}
