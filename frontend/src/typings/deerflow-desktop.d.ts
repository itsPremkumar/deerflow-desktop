export interface DeerflowDesktopStatusPayload {
  message: string;
  detail?: string;
}

export interface DeerflowAutoStartState {
  /** False in browsers and source checkouts: the toggle is hidden. */
  supported: boolean;
  /** The persisted user preference (source of truth). */
  enabled: boolean;
  /** The OS-reported login-item state. */
  active: boolean;
}

export interface DeerflowDesktopBridge {
  platform: NodeJS.Platform;
  onStatus: (callback: (payload: DeerflowDesktopStatusPayload) => void) => () => void;
  getStatus: () => Promise<unknown>;
  openUserData: () => Promise<unknown>;
  getAutoStart: () => Promise<DeerflowAutoStartState>;
  setAutoStart: (enabled: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    deerflow?: DeerflowDesktopBridge;
  }
}

export {};
