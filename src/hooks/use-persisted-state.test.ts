// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useLocalStorageBoolean } from "./use-persisted-state";

const localStorageBackingStore = new Map<string, string>();

function ensureTestLocalStorage() {
  if (typeof window.localStorage.clear !== "function" || !isUsableStorage(window.localStorage)) {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  }
}

function isUsableStorage(storage: Storage) {
  try {
    storage.clear();
    return true;
  } catch {
    return false;
  }
}

function createMemoryStorage(): Storage {
  return {
    get length() {
      return localStorageBackingStore.size;
    },
    clear: () => {
      localStorageBackingStore.clear();
    },
    getItem: (key: string) => localStorageBackingStore.get(key) ?? null,
    key: (index: number) => Array.from(localStorageBackingStore.keys())[index] ?? null,
    removeItem: (key: string) => {
      localStorageBackingStore.delete(key);
    },
    setItem: (key: string, value: string) => {
      localStorageBackingStore.set(key, String(value));
    },
  };
}

function createStorageEvent(key: string, newValue: string | null): StorageEvent {
  const event = new Event("storage") as StorageEvent;
  Object.defineProperties(event, {
    key: { value: key },
    newValue: { value: newValue },
    storageArea: { value: window.localStorage },
  });
  return event;
}

beforeEach(() => {
  ensureTestLocalStorage();
  window.localStorage.clear();
});

describe("useLocalStorageBoolean", () => {
  describe("initialization behavior", () => {
    test("reads an existing stored value", async () => {
      window.localStorage.setItem("systify.test.flag", "false");

      const { result } = renderHook(() => useLocalStorageBoolean("systify.test.flag", true));

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });

    test("follows changing default when no stored value exists", async () => {
      const { result, rerender } = renderHook(
        ({ defaultValue }) => useLocalStorageBoolean("systify.test.flag", defaultValue),
        { initialProps: { defaultValue: true } },
      );

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });

      rerender({ defaultValue: false });

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });
  });

  describe("persistence behavior", () => {
    test("locks manual updates against later default changes", async () => {
      const { result, rerender } = renderHook(
        ({ defaultValue }) => useLocalStorageBoolean("systify.test.flag", defaultValue),
        { initialProps: { defaultValue: true } },
      );

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });

      act(() => {
        result.current[1](false);
      });

      await waitFor(() => {
        expect(window.localStorage.getItem("systify.test.flag")).toBe("false");
      });

      rerender({ defaultValue: true });

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });

    test("falls back to in-memory state when localStorage throws", async () => {
      const getItemSpy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });

      try {
        const { result } = renderHook(() => useLocalStorageBoolean("systify.test.flag", true));

        await waitFor(() => {
          expect(result.current[0]).toBe(true);
        });

        act(() => {
          result.current[1](false);
        });

        await waitFor(() => {
          expect(result.current[0]).toBe(false);
        });
      } finally {
        getItemSpy.mockRestore();
        setItemSpy.mockRestore();
      }
    });
  });

  describe("cross-tab synchronization behavior", () => {
    test("syncs value when same key changes in another tab", async () => {
      window.localStorage.setItem("systify.test.flag", "true");
      const { result } = renderHook(() => useLocalStorageBoolean("systify.test.flag", false));

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });

      act(() => {
        window.dispatchEvent(createStorageEvent("systify.test.flag", "false"));
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });

    test("falls back to default when same key is removed in another tab", async () => {
      window.localStorage.setItem("systify.test.flag", "false");
      const { result } = renderHook(() => useLocalStorageBoolean("systify.test.flag", true));

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });

      act(() => {
        window.dispatchEvent(createStorageEvent("systify.test.flag", null));
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });
    });
  });
});
