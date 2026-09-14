import { afterEach, describe, expect, it, rs } from "@rstest/core";

import {
  getAutoStart,
  getDesktopPlatform,
  isDesktopApp,
  setAutoStart,
} from "@/core/desktop/api";

function stubBridge(overrides: Record<string, unknown> = {}) {
  const calls: { method: string; args: unknown[] } = { method: "", args: [] };
  const bridge = {
    platform: "win32",
    onStatus: rs.fn(),
    getStatus: rs.fn(),
    openUserData: rs.fn(),
    getAutoStart: rs.fn(async () => ({
      supported: true,
      enabled: true,
      active: true,
    })),
    setAutoStart: rs.fn(async (enabled: boolean) => {
      calls.method = "setAutoStart";
      calls.args = [enabled];
      return enabled;
    }),
    ...overrides,
  };
  (window as unknown as Record<string, unknown>).deerflow = bridge;
  return { bridge, calls };
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).deerflow;
});

describe("desktop bridge inside Electron", () => {
  it("detects the app and reports the platform", () => {
    stubBridge();
    expect(isDesktopApp()).toBe(true);
    expect(getDesktopPlatform()).toBe("win32");
  });

  it("passes the auto-start state through", async () => {
    stubBridge();
    await expect(getAutoStart()).resolves.toEqual({
      supported: true,
      enabled: true,
      active: true,
    });
  });

  it("normalizes bridge values to booleans", async () => {
    stubBridge({
      getAutoStart: rs.fn(async () => ({
        supported: 1,
        enabled: 0,
        active: null,
      })),
    });
    await expect(getAutoStart()).resolves.toEqual({
      supported: true,
      enabled: false,
      active: false,
    });
  });

  it("forwards writes with a boolean", async () => {
    const { calls } = stubBridge();
    await expect(setAutoStart(true)).resolves.toBe(true);
    expect(calls).toEqual({ method: "setAutoStart", args: [true] });
  });

  it("degrades to unsupported when the bridge throws", async () => {
    stubBridge({
      getAutoStart: rs.fn(async () => {
        throw new Error("ipc gone");
      }),
    });
    await expect(getAutoStart()).resolves.toEqual({
      supported: false,
      enabled: false,
      active: false,
    });
  });
});
