import { describe, it, expect, vi } from 'vitest';
import { debounce } from '@/lib/debounce';

describe('debounce', () => {
  it('delays the call until the trailing edge', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(); d(); d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
  it('passes the latest arguments through', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d(1); d(2); d(3);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
