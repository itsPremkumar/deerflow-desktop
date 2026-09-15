import { get, send, asList, pick } from "./http";

export interface ChannelState {
  name: string;
  enabled: boolean;
  connected: boolean;
  status: string;
}

export async function channelStatus(): Promise<ChannelState[]> {
  try {
    const d = await get<Record<string, unknown>>("/channels");
    const list = asList(d.channels ?? d, ["channels", "data"]);
    if (list.length > 0) {
      return list.map((c) => ({
        name: String(pick(c, ["name", "channel"], "")),
        enabled: Boolean(pick(c, ["enabled"], false)),
        connected: Boolean(pick(c, ["connected", "running"], false)),
        status: String(pick(c, ["status", "state"], "")),
      }));
    }
  } catch {
    /* fall through */
  }
  return [];
}

export async function restartChannel(name: string): Promise<string> {
  const d = await send<Record<string, unknown>>(`/channels/${encodeURIComponent(name)}/restart`, "POST", {});
  return String(pick(d, ["message", "status"], "Restart requested."));
}

export interface ChannelProvider {
  id: string;
  name: string;
  description: string;
  configured: boolean;
}

export async function listProviders(): Promise<ChannelProvider[]> {
  try {
    const d = await get<unknown>("/channel-connections/providers");
    return asList(d, ["providers", "data"]).map((p) => ({
      id: String(pick(p, ["id", "provider"], "")),
      name: String(pick(p, ["name", "display_name"], "")),
      description: String(pick(p, ["description"], "")),
      configured: Boolean(pick(p, ["configured", "connected"], false)),
    }));
  } catch {
    return [];
  }
}

export interface ChannelConnection {
  id: string;
  provider: string;
  label: string;
  status: string;
}

export async function listConnections(): Promise<ChannelConnection[]> {
  try {
    const d = await get<unknown>("/channel-connections/connections");
    return asList(d, ["connections", "data"]).map((c, i) => ({
      id: String(pick(c, ["id", "connection_id"], `conn-${i}`)),
      provider: String(pick(c, ["provider"], "")),
      label: String(pick(c, ["label", "name"], "")),
      status: String(pick(c, ["status", "state"], "")),
    }));
  } catch {
    return [];
  }
}

export async function connectProvider(provider: string): Promise<Record<string, unknown>> {
  return send<Record<string, unknown>>(`/channel-connections/${encodeURIComponent(provider)}/connect`, "POST", {});
}

export async function disconnectConnection(connectionId: string): Promise<void> {
  await send(`/channel-connections/connections/${encodeURIComponent(connectionId)}`, "DELETE");
}

export async function larkStatus(): Promise<Record<string, unknown> | null> {
  try {
    return await get<Record<string, unknown>>("/integrations/lark/status");
  } catch {
    return null;
  }
}
