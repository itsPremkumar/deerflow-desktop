import { get, send, asList, pick } from "./http";

export interface MemoryFact {
  id: string;
  content: string;
  [key: string]: unknown;
}

export interface MemoryData {
  facts: MemoryFact[];
  summary: string;
  raw: Record<string, unknown>;
}

export async function fetchMemory(): Promise<MemoryData> {
  const d = await get<Record<string, unknown>>("/memory");
  return {
    facts: asList(d.facts, []).map((f, i) => ({
      ...(f as Record<string, unknown>),
      id: String(pick(f, ["id", "fact_id"], `fact-${i}`)),
      content: String(pick(f, ["content", "text", "fact"], "")),
    })),
    summary: String(pick(d, ["summary", "summary_text"], "")),
    raw: d,
  };
}

export async function reloadMemory(): Promise<MemoryData> {
  await send("/memory/reload", "POST", {});
  return fetchMemory();
}

export async function clearMemory(): Promise<void> {
  await send("/memory", "DELETE");
}

export async function addFact(content: string): Promise<void> {
  await send("/memory/facts", "POST", { content });
}

export async function deleteFact(factId: string): Promise<void> {
  await send(`/memory/facts/${encodeURIComponent(factId)}`, "DELETE");
}

export async function updateFact(factId: string, content: string): Promise<void> {
  await send(`/memory/facts/${encodeURIComponent(factId)}`, "PATCH", { content });
}

export async function memoryStatus(): Promise<Record<string, unknown> | null> {
  try {
    return await get<Record<string, unknown>>("/memory/status");
  } catch {
    return null;
  }
}
