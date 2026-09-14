import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";

import { UnauthorizedError } from "@/core/api/errors";
import { fetch as apiFetch } from "@/core/api/fetcher";

describe("api fetcher server-side unauthorized", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = rs.fn(
      async () => new Response("", { status: 401 }),
    ) as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws UnauthorizedError without touching window on the server", async () => {
    expect(typeof window).toBe("undefined");
    await expect(apiFetch("/api/threads/t-1")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
