// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useLocalStorageBoolean } from './use-persisted-state';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useLocalStorageBoolean', () => {
  describe('initialization behavior', () => {
    test('reads an existing stored value', async () => {
      window.localStorage.setItem('systify.test.flag', 'false');

      const { result } = renderHook(() => useLocalStorageBoolean('systify.test.flag', true));

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });

    test('follows changing default when no stored value exists', async () => {
      const { result, rerender } = renderHook(
        ({ defaultValue }) => useLocalStorageBoolean('systify.test.flag', defaultValue),
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

  describe('persistence behavior', () => {
    test('locks manual updates against later default changes', async () => {
      const { result, rerender } = renderHook(
        ({ defaultValue }) => useLocalStorageBoolean('systify.test.flag', defaultValue),
        { initialProps: { defaultValue: true } },
      );

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });

      act(() => {
        result.current[1](false);
      });

      await waitFor(() => {
        expect(window.localStorage.getItem('systify.test.flag')).toBe('false');
      });

      rerender({ defaultValue: true });

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });

    test('falls back to in-memory state when localStorage throws', async () => {
      const getItemSpy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('blocked');
        });
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('blocked');
        });

      try {
        const { result } = renderHook(() => useLocalStorageBoolean('systify.test.flag', true));

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

  describe('cross-tab synchronization behavior', () => {
    test('syncs value when same key changes in another tab', async () => {
      window.localStorage.setItem('systify.test.flag', 'true');
      const { result } = renderHook(() => useLocalStorageBoolean('systify.test.flag', false));

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'systify.test.flag',
            newValue: 'false',
            storageArea: window.localStorage,
          }),
        );
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });
    });

    test('falls back to default when same key is removed in another tab', async () => {
      window.localStorage.setItem('systify.test.flag', 'false');
      const { result } = renderHook(() => useLocalStorageBoolean('systify.test.flag', true));

      await waitFor(() => {
        expect(result.current[0]).toBe(false);
      });

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'systify.test.flag',
            newValue: null,
            storageArea: window.localStorage,
          }),
        );
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });
    });
  });
});
