import { get, send, asList, pick } from "./http";

export interface ThreadGoal {
  goal: string | null;
  updated_at?: string | null;
}

export async function searchThreads(query: string, limit = 20): Promise<Array<Record<string, unknown>>> {
  const d = await send<unknown>("/threads/search", "POST", { query, limit });
  return asList(d, ["threads", "results", "data"]);
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}`, "PATCH", { title });
}

export async function deleteThread(threadId: string): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}`, "DELETE");
}

export async function branchThread(threadId: string): Promise<{ thread_id: string }> {
  const d = await send<Record<string, unknown>>(
    `/threads/${encodeURIComponent(threadId)}/branches`,
    "POST",
    {}
  );
  return { thread_id: String(pick(d, ["thread_id", "new_thread_id", "id"], "")) };
}

export async function moveThread(threadId: string, projectId: string | null): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}/move`, "POST", { project_id: projectId });
}

export async function fetchGoal(threadId: string): Promise<ThreadGoal> {
  try {
    const d = await get<Record<string, unknown>>(`/threads/${encodeURIComponent(threadId)}/goal`);
    const goal = pick<string | null>(d, ["goal", "text"], null);
    return { goal: goal || null, updated_at: (d.updated_at as string) ?? null };
  } catch {
    return { goal: null };
  }
}

export async function setGoal(threadId: string, goal: string): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}/goal`, "PUT", { goal });
}

export async function clearGoal(threadId: string): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}/goal`, "DELETE");
}

export async function compactThread(threadId: string): Promise<string> {
  const d = await send<Record<string, unknown>>(
    `/threads/${encodeURIComponent(threadId)}/compact`,
    "POST",
    {}
  );
  return String(pick(d, ["summary", "summary_text", "message"], "Context compacted."));
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextPercent: number | null;
}

export async function fetchTokenUsage(threadId: string): Promise<TokenUsage | null> {
  try {
    const d = await get<Record<string, unknown>>(
      `/threads/${encodeURIComponent(threadId)}/token-usage`
    );
    const input = Number(pick(d, ["input_tokens", "prompt_tokens"], 0));
    const output = Number(pick(d, ["output_tokens", "completion_tokens"], 0));
    const ctx = d.context_usage;
    const pct =
      ctx && typeof ctx === "object"
        ? Number((ctx as Record<string, unknown>).percent ?? (ctx as Record<string, unknown>).percentage ?? NaN)
        : Number(d.context_percent ?? NaN);
    return {
      inputTokens: input,
      outputTokens: output,
      totalTokens: Number(pick(d, ["total_tokens"], input + output)),
      contextPercent: Number.isFinite(pct) ? Math.round(pct) : null,
    };
  } catch {
    return null;
  }
}
