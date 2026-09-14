import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";

import {
  listConsoleRuns,
  resumeThreadRun,
} from "@/core/console/api";

describe("console runs client", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns runs on success", async () => {
    globalThis.fetch = rs.fn(
      async () =>
        new Response(JSON.stringify({ runs: [{ run_id: "r1" }], has_more: false }), {
          status: 200,
        }),
    ) as unknown as typeof globalThis.fetch;
    await expect(listConsoleRuns()).resolves.toEqual([{ run_id: "r1" }]);
  });

  it("degrades to an empty list when the backend cannot serve stats", async () => {
    globalThis.fetch = rs.fn(
      async () => new Response("", { status: 503 }),
    ) as unknown as typeof globalThis.fetch;
    await expect(listConsoleRuns()).resolves.toEqual([]);
  });

  it("resumes a run and returns the new run", async () => {
    globalThis.fetch = rs.fn(
      async () =>
        new Response(
          JSON.stringify({ run_id: "r2", thread_id: "t1", status: "running" }),
          { status: 202 },
        ),
    ) as unknown as typeof globalThis.fetch;
    await expect(resumeThreadRun("t1", "r1")).resolves.toEqual({
      run_id: "r2",
      thread_id: "t1",
      status: "running",
    });
  });

  it("surfaces the gateway detail when resume is rejected", async () => {
    globalThis.fetch = rs.fn(
      async () =>
        new Response(JSON.stringify({ detail: "Run r1 already completed" }), {
          status: 409,
        }),
    ) as unknown as typeof globalThis.fetch;
    await expect(resumeThreadRun("t1", "r1")).rejects.toThrow(
      "Run r1 already completed",
    );
  });
});
