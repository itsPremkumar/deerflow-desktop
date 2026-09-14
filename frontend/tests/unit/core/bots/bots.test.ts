import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";

import { cloneBot, listBotTemplates, listBots } from "@/core/bots/api";

describe("bots client", () => {
  let originalFetch: typeof globalThis.fetch;
  let lastUrl: string;
  let lastInit: RequestInit | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    lastUrl = "";
    lastInit = undefined;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockJson(body: unknown, status = 200) {
    globalThis.fetch = rs.fn(async (url: string, init?: RequestInit) => {
      lastUrl = url;
      lastInit = init;
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof globalThis.fetch;
  }

  it("lists templates", async () => {
    mockJson({ templates: [{ slug: "sre", display: "SRE" }], count: 1 });
    await expect(listBotTemplates()).resolves.toEqual([
      { slug: "sre", display: "SRE" },
    ]);
    expect(lastUrl).toContain("/api/bots/templates");
  });

  it("passes the status filter when listing", async () => {
    mockJson({ bots: [], count: 0 });
    await listBots("sleeping");
    expect(lastUrl).toContain("/api/bots?status=sleeping");
  });

  it("clones via POST with the source in the body", async () => {
    mockJson({ name: "sre-2" }, 201);
    await expect(
      cloneBot("sre-2", { source: "sre" }),
    ).resolves.toEqual({ name: "sre-2" });
    expect(lastUrl).toContain("/api/bots/sre-2/clone");
    expect(lastInit?.method).toBe("POST");
    expect(JSON.parse((lastInit?.body as string) ?? "")).toEqual({ source: "sre" });
  });

  it("surfaces the gateway detail when cloning fails", async () => {
    mockJson({ detail: "Bot 'sre-2' already exists" }, 422);
    await expect(cloneBot("sre-2", { source: "sre" })).rejects.toThrow(
      "Bot 'sre-2' already exists",
    );
  });
});
