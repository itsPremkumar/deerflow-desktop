import { get, send, asList, pick, GATEWAY_BASE } from "./http";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export async function listUploads(threadId: string): Promise<UploadedFile[]> {
  try {
    const d = await get<unknown>(`/threads/${encodeURIComponent(threadId)}/uploads/list`);
    return asList(d, ["files", "uploads", "data"]).map((f) => ({
      name: String(pick(f, ["filename", "name", "path"], "")),
      size: Number(pick(f, ["size", "size_bytes"], 0)),
      type: String(pick(f, ["content_type", "type"], "")),
    }));
  } catch {
    return [];
  }
}

export async function uploadFiles(threadId: string, files: FileList | File[]): Promise<UploadedFile[]> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append("files", f));
  const res = await fetch(`${GATEWAY_BASE}/threads/${encodeURIComponent(threadId)}/uploads`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return asList(data, ["files", "uploads", "data"]).map((f) => ({
    name: String(pick(f, ["filename", "name", "path"], "")),
    size: Number(pick(f, ["size", "size_bytes"], 0)),
    type: String(pick(f, ["content_type", "type"], "")),
  }));
}

export async function deleteUpload(threadId: string, filename: string): Promise<void> {
  await send(`/threads/${encodeURIComponent(threadId)}/uploads/${encodeURIComponent(filename)}`, "DELETE");
}

export async function uploadLimits(): Promise<Record<string, unknown> | null> {
  // Thread-scoped limits endpoint needs a thread; global best-effort probe:
  try {
    return await get<Record<string, unknown>>("/threads/_/uploads/limits");
  } catch {
    return null;
  }
}

/** Download URL for an artifact (opens in a new tab; active content forces download server-side). */
export function artifactUrl(threadId: string, path: string, download = false): string {
  const clean = path.replace(/^\/+/, "");
  return `${GATEWAY_BASE}/threads/${encodeURIComponent(threadId)}/artifacts/${clean
    .split("/")
    .map(encodeURIComponent)
    .join("/")}${download ? "?download=true" : ""}`;
}

/** Fetch a text artifact for inline preview. Throws for binary/oversized content. */
export async function previewArtifact(threadId: string, path: string): Promise<string> {
  const res = await fetch(artifactUrl(threadId, path));
  if (!res.ok) throw new Error(`Cannot preview (${res.status})`);
  const blob = await res.blob();
  if (blob.size > 200_000) throw new Error("File is too large to preview — use download.");
  const type = blob.type || "";
  if (!type.startsWith("text/") && !type.includes("json") && !type.includes("markdown") && type !== "") {
    // Try decoding anyway for typical code/text without content-type
    if (!/\.(txt|md|json|yaml|yml|csv|log|py|ts|tsx|js|jsx|css|html|xml|sh)$/i.test(path)) {
      throw new Error("Binary file — use download instead of preview.");
    }
  }
  return await blob.text();
}

export async function saveArtifact(threadId: string, path: string, content: string, sha256: string): Promise<void> {
  const clean = path.replace(/^\/+/, "");
  await send(
    `/threads/${encodeURIComponent(threadId)}/artifacts/${clean.split("/").map(encodeURIComponent).join("/")}`,
    "PUT",
    { content, expected_sha256: sha256 }
  );
}
