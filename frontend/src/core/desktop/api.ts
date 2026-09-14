import type { AutoStartState } from "./types";

/** True only inside the Electron desktop app (SSR-safe). */
export function isDesktopApp(): boolean {
  return (
    typeof window !== "undefined" && typeof window.deerflow !== "undefined"
  );
}

/** OS reported by the desktop bridge, or null in browsers / on the server. */
export function getDesktopPlatform(): string | null {
  if (!isDesktopApp()) return null;
  return window.deerflow?.platform ?? null;
}

const UNSUPPORTED: AutoStartState = {
  supported: false,
  enabled: false,
  active: false,
};

export async function getAutoStart(): Promise<AutoStartState> {
  if (!isDesktopApp()) return UNSUPPORTED;
  try {
    const state = await window.deerflow?.getAutoStart();
    if (!state) return UNSUPPORTED;
    return {
      supported: Boolean(state.supported),
      enabled: Boolean(state.enabled),
      active: Boolean(state.active),
    };
  } catch {
    return UNSUPPORTED;
  }
}

export async function setAutoStart(enabled: boolean): Promise<boolean> {
  if (!isDesktopApp() || !window.deerflow) {
    throw new Error("Start with Windows is only available in the desktop app.");
  }
  return window.deerflow.setAutoStart(enabled);
}
