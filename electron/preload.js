'use strict';

/**
 * DeerFlow Desktop preload script.
 *
 * Runs in an isolated world before the page loads. Only exposes a minimal
 * API over IPC — no Node.js access is leaked to the renderer. Writes are
 * limited to explicit user toggles (currently: start-with-Windows).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deerflow', {
  platform: process.platform,

  /**
   * Subscribe to lifecycle/status broadcasts from the main process.
   * @param {(payload: { message: string, detail?: string }) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onStatus(callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('deerflow:status', listener);
    return () => ipcRenderer.removeListener('deerflow:status', listener);
  },

  /** Current orchestration state (URLs, child PIDs, mode). */
  getStatus() {
    return ipcRenderer.invoke('deerflow:status');
  },

  /** Open the per-user data folder (config, homes, logs) in Explorer. */
  openUserData() {
    return ipcRenderer.invoke('deerflow:open-user-data');
  },

  /**
   * Start-with-Windows login item state.
   * @returns {Promise<{ supported: boolean, enabled: boolean, active: boolean }>}
   */
  getAutoStart() {
    return ipcRenderer.invoke('deerflow:get-auto-start');
  },

  /**
   * Register or clear the Windows login item (installed app only).
   * @param {boolean} enabled
   * @returns {Promise<boolean>} the OS-reported state after applying.
   */
  setAutoStart(enabled) {
    return ipcRenderer.invoke('deerflow:set-auto-start', Boolean(enabled));
  },
});
