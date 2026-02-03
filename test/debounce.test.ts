import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../src/webview/utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('flush should execute immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('value');
    expect(fn).not.toHaveBeenCalled();

    debounced.flush();
    expect(fn).toHaveBeenCalledWith('value');
  });

  it('flush with no pending call should be a no-op', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel should prevent execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('value');
    debounced.cancel();

    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should handle multiple flush calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('value');
    debounced.flush();
    debounced.flush(); // second flush should be no-op

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
