import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaved } from '../hooks/useSaved';

// Mock API calls so tests don't need a real server
vi.mock('../lib/api', () => ({
  saveListing: vi.fn(() => Promise.resolve({ id: 'saved-1' })),
  unsaveListing: vi.fn(() => Promise.resolve({ message: 'Removed' })),
}));

describe('useSaved', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('generates a session token on first render', () => {
    const { result } = renderHook(() => useSaved());
    expect(result.current.sessionToken).toBeTruthy();
    expect(result.current.sessionToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('produces stable session token across re-renders', () => {
    const { result, rerender } = renderHook(() => useSaved());
    const token1 = result.current.sessionToken;
    rerender();
    expect(result.current.sessionToken).toBe(token1);
  });

  it('persists session token across hook unmount and remount', () => {
    const { result: r1, unmount: u1 } = renderHook(() => useSaved());
    const token = r1.current.sessionToken;
    u1();

    const { result: r2 } = renderHook(() => useSaved());
    expect(r2.current.sessionToken).toBe(token);
  });

  it('starts with empty savedIds', () => {
    const { result } = renderHook(() => useSaved());
    expect(result.current.savedCount).toBe(0);
  });

  it('saveListingId adds to savedIds', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.saveListingId('listing-abc');
    });
    expect(result.current.isSaved('listing-abc')).toBe(true);
  });

  it('saveListingId is idempotent (duplicate save does not change count)', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.saveListingId('listing-abc');
      result.current.saveListingId('listing-abc');
    });
    expect(result.current.savedCount).toBe(1);
  });

  it('removeSavedId removes from savedIds', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.saveListingId('listing-abc');
    });
    act(() => {
      result.current.removeSavedId('listing-abc');
    });
    expect(result.current.isSaved('listing-abc')).toBe(false);
  });

  it('removeSavedId on non-existent id is a no-op', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.removeSavedId('nonexistent');
    });
    expect(result.current.savedCount).toBe(0);
  });

  it('savedCount reflects number of saved listings', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.saveListingId('a');
      result.current.saveListingId('b');
      result.current.saveListingId('c');
    });
    expect(result.current.savedCount).toBe(3);
  });

  it('savedCount decrements when listing is removed', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.saveListingId('a');
      result.current.saveListingId('b');
    });
    act(() => {
      result.current.removeSavedId('a');
    });
    expect(result.current.savedCount).toBe(1);
  });

  it('persists savedIds to localStorage', () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.saveListingId('listing-xyz');
    });
    const stored = JSON.parse(localStorage.getItem('cs_saved_ids') ?? '[]') as string[];
    expect(stored).toContain('listing-xyz');
  });

  it('loads savedIds from localStorage on mount', () => {
    // Pre-seed localStorage
    localStorage.setItem('cs_saved_ids', JSON.stringify(['pre-saved-1', 'pre-saved-2']));
    const { result } = renderHook(() => useSaved());
    expect(result.current.isSaved('pre-saved-1')).toBe(true);
    expect(result.current.isSaved('pre-saved-2')).toBe(true);
    expect(result.current.savedCount).toBe(2);
  });

  it('isSaved returns false for an unsaved listing', () => {
    const { result } = renderHook(() => useSaved());
    expect(result.current.isSaved('not-saved')).toBe(false);
  });

  it('isSaved returns true after save and false after remove', () => {
    const { result } = renderHook(() => useSaved());
    act(() => result.current.saveListingId('toggle-me'));
    expect(result.current.isSaved('toggle-me')).toBe(true);
    act(() => result.current.removeSavedId('toggle-me'));
    expect(result.current.isSaved('toggle-me')).toBe(false);
  });

  it('localStorage is updated after remove', () => {
    const { result } = renderHook(() => useSaved());
    act(() => result.current.saveListingId('remove-me'));
    act(() => result.current.removeSavedId('remove-me'));
    const stored = JSON.parse(localStorage.getItem('cs_saved_ids') ?? '[]') as string[];
    expect(stored).not.toContain('remove-me');
  });
});
