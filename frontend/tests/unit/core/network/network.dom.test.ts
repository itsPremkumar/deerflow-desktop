import { describe, expect, it } from "@rstest/core";
import { act, renderHook } from "@testing-library/react";

import { useBrowserOnline } from "@/core/network/hooks";

function setOnline(value: boolean) {
  // happy-dom does not flip navigator.onLine on synthetic events (real
  // browsers do), so drive the property explicitly and emit the event the
  // hook subscribes to — this exercises the hook's subscribe/snapshot path.
  act(() => {
    Object.defineProperty(window.navigator, "onLine", {
      value,
      configurable: true,
    });
    window.dispatchEvent(new Event(value ? "online" : "offline"));
  });
}

describe("useBrowserOnline", () => {
  it("tracks online/offline transitions", () => {
    setOnline(true);
    const { result, unmount } = renderHook(() => useBrowserOnline());
    try {
      expect(result.current).toBe(true);
      setOnline(false);
      expect(result.current).toBe(false);
      setOnline(true);
      expect(result.current).toBe(true);
    } finally {
      unmount();
      setOnline(true);
    }
  });
});
