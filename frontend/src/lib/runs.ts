import { get, send, asList, pick } from "./http";

export interface RunInfo {
  run_id: string;
  thread_id: string;
  status: string;
  assistant_id: string;
  model: string;
  created_at: string;
  error: string | null;
}

function toRun(r: Record<string, unknown>): RunInfo {
  return {
    run_id: String(pick(r, ["run_id", "id"], "")),
    thread_id: String(pick(r, ["thread_id"], "")),
    status: String(pick(r, ["status"], "unknown")),
    assistant_id: String(pick(r, ["assistant_id", "assistant"], "")),
    model: String(pick(r, ["model", "model_name"], "—")),
    created_at: String(pick(r, ["created_at"], "")),
    error: (r.error as string | null) ?? null,
  };
}

export async function listThreadRuns(threadId: string): Promise<RunInfo[]> {
  const d = await get<unknown>(`/threads/${encodeURIComponent(threadId)}/runs`);
  return asList(d, ["runs", "data"]).map((r) => toRun(r));
}

export async function fetchRun(threadId: string, runId: string): Promise<RunInfo> {
  const d = await get<Record<string, unknown>>(
    `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}`
  );
  return toRun(d);
}

export async function cancelRun(threadId: string, runId: string): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}/cancel`, "POST", {});
}

export async function fetchRunMessages(
  threadId: string,
  runId: string
): Promise<Array<Record<string, unknown>>> {
  const d = await get<unknown>(
    `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}/messages`
  );
  return asList(d, ["messages", "data"]);
}

export async function fetchRunEvents(threadId: string, runId: string): Promise<unknown[]> {
  const d = await get<unknown>(
    `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}/events`
  );
  return asList(d, ["events", "data"]);
}

export interface WorkspaceChange {
  path: string;
  kind: string;
  diff?: string | null;
}

export async function fetchWorkspaceChanges(threadId: string, runId: string): Promise<WorkspaceChange[]> {
  const d = await get<unknown>(
    `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}/workspace-changes`
  );
  return asList(d, ["changes", "files", "data"]).map((c) => ({
    path: String(pick(c, ["path", "file"], "")),
    kind: String(pick(c, ["kind", "change", "status"], "modified")),
    diff: (c.diff as string | null) ?? null,
  }));
}

/** Ask the backend for clean regenerate input for the latest answer. Returns null when unsupported. */
export async function prepareRegenerate(threadId: string): Promise<Record<string, unknown> | null> {
  try {
    return await send<Record<string, unknown>>(
      `/threads/${encodeURIComponent(threadId)}/runs/regenerate/prepare`,
      "POST",
      {}
    );
  } catch {
    return null;
  }
}

/** Ask the backend for edit-replay input. Returns null when unsupported. */
export async function prepareEditRegenerate(
  threadId: string,
  message: string
): Promise<Record<string, unknown> | null> {
  try {
    return await send<Record<string, unknown>>(
      `/threads/${encodeURIComponent(threadId)}/runs/edit-regenerate/prepare`,
      "POST",
      { message }
    );
  } catch {
    return null;
  }
}
