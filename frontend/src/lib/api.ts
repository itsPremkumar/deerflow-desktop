import { ChatMessage, Thread, AIModel } from "@/types/chat";

const BASE_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "/api/gateway";

export async function fetchThreads(limit = 100): Promise<Thread[]> {
  try {
    const res = await fetch(`${BASE_URL}/threads?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.threads || []).map((t: any) => ({
      thread_id: t.thread_id,
      title: t.metadata?.title || t.title || "Untitled Session",
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString(),
      // Backend-owned bot association (thread metadata + assistant link).
      botName: t.metadata?.bot_name || t.bot_name || null,
      assistantId: t.assistant_id || null,
      projectId: t.metadata?.deerflow_project_id || t.project_id || null,
    }));
  } catch (err) {
    console.error("Failed to fetch threads:", err);
    return [];
  }
}

export interface CreateThreadOptions {
  /** Specialist bot owning this conversation — stored on the server thread. */
  botName?: string | null;
  projectId?: string | null;
}

export async function createThread(title?: string, opts?: CreateThreadOptions): Promise<string> {
  const metadata: Record<string, string> = { title: title || "New Conversation" };
  if (opts?.botName) metadata.bot_name = opts.botName;
  const body: Record<string, unknown> = {
    metadata,
    ...(opts?.botName ? { assistant_id: opts.botName } : {}),
    ...(opts?.projectId ? { project_id: opts.projectId } : {}),
  };
  const res = await fetch(`${BASE_URL}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create thread");
  const data = await res.json();
  return data.thread_id;
}

export async function fetchThreadHistory(threadId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${BASE_URL}/threads/${threadId}/history`);
    if (!res.ok) return [];
    const data = await res.json();
    const messages = data.messages || [];
    return messages.map((m: any, idx: number) => ({
      id: m.id || `msg-${idx}`,
      role: m.type === "human" || m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      thinking: m.additional_kwargs?.thinking || "",
      toolCalls: (m.tool_calls || []).map((tc: any) => ({
        id: tc.id,
        name: tc.name,
        args: tc.args || {},
      })),
      createdAt: m.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Failed to fetch thread history:", err);
    return [];
  }
}

export async function fetchAvailableModels(): Promise<AIModel[]> {
  try {
    const res = await fetch(`${BASE_URL}/models`);
    if (!res.ok) throw new Error("Models endpoint error");
    const data = await res.json();
    return (data.models || []).map((m: any) => ({
      id: m.id || m.name,
      name: m.display_name || m.name || m.id,
      provider: m.provider || "Standard",
      description: m.description || "",
    }));
  } catch {
    return [
      { id: "default", name: "Default Frontier Agent", provider: "Config" },
      { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic" },
      { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
      { id: "deepseek", name: "DeepSeek Reasoning", provider: "DeepSeek" },
    ];
  }
}
