import { describe, expect, it } from "@rstest/core";

import {
  getAutoStart,
  getDesktopPlatform,
  isDesktopApp,
  setAutoStart,
} from "@/core/desktop/api";

describe("desktop bridge outside Electron", () => {
  it("reports no desktop app on the server", () => {
    expect(typeof window).toBe("undefined");
    expect(isDesktopApp()).toBe(false);
  });

  it("returns null platform without a bridge", () => {
    expect(getDesktopPlatform()).toBeNull();
  });

  it("returns the unsupported state without a bridge", async () => {
    await expect(getAutoStart()).resolves.toEqual({
      supported: false,
      enabled: false,
      active: false,
    });
  });

  it("refuses writes without a bridge", async () => {
    await expect(setAutoStart(true)).rejects.toThrow();
  });
});
