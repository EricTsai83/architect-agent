// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useTypewriter } from './use-typewriter';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTypewriter', () => {
  test('returns empty string on first render before any timer fires', () => {
    const { result } = renderHook(() => useTypewriter({ words: ['hello'] }));
    expect(result.current).toBe('');
  });

  test('types out the first phrase one character at a time', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        words: ['hi'],
        typeSpeed: 100,
      }),
    );

    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('h');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('hi');
  });

  test('cycles to the next phrase after typing, pausing, and deleting', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        words: ['ab', 'xy'],
        typeSpeed: 10,
        deleteSpeed: 10,
        pauseAfterType: 50,
        pauseAfterDelete: 50,
      }),
    );

    // Helper — `vi.advanceTimersByTime` returns the vi instance, which
    // would make `act(() => vi.advanceTimersByTime(n))` look like a
    // floating Promise to the linter. Wrapping in a void-returning block
    // sidesteps that without an eslint-disable.
    const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

    // Type "ab"
    tick(10);
    expect(result.current).toBe('a');
    tick(10);
    expect(result.current).toBe('ab');

    // Once typing completes, the hook transitions to pausingType
    // synchronously (no 0ms timer), then the pauseAfterType delay fires.
    tick(50);

    // Delete "ab" → ""
    tick(10);
    expect(result.current).toBe('a');
    tick(10);
    expect(result.current).toBe('');

    // Deletion complete → synchronous transition to pausingDelete,
    // then the pauseAfterDelete delay fires.
    tick(50);

    // Type "xy"
    tick(10);
    expect(result.current).toBe('x');
    tick(10);
    expect(result.current).toBe('xy');
  });

  test('returns empty string while inactive and resumes when reactivated', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useTypewriter({ words: ['hi'], typeSpeed: 100, active }),
      { initialProps: { active: true } },
    );

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('h');

    // Flip inactive — the consumer sees an empty string, no timers run.
    rerender({ active: false });
    expect(result.current).toBe('');

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe('');

    // Flip back on; the cycle resumes from where it paused ("h" → "hi").
    rerender({ active: true });
    expect(result.current).toBe('h');

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('hi');
  });

  test('handles an empty word list without crashing', () => {
    const { result } = renderHook(() => useTypewriter({ words: [] }));
    expect(result.current).toBe('');

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe('');
  });
});
