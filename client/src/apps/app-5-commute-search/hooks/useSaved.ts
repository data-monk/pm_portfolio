import { useState, useCallback, useEffect } from 'react';
import { generateUUID } from '../lib/utils';
import { saveListing, unsaveListing } from '../lib/api';

const SESSION_TOKEN_KEY = 'cs_session_token';
const SAVED_IDS_KEY = 'cs_saved_ids';

function getOrCreateSessionToken(): string {
  const existing = localStorage.getItem(SESSION_TOKEN_KEY);
  if (existing) return existing;
  const token = generateUUID();
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  return token;
}

function loadSavedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_IDS_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function persistSavedIds(ids: Set<string>): void {
  localStorage.setItem(SAVED_IDS_KEY, JSON.stringify([...ids]));
}

interface UseSavedReturn {
  savedIds: Set<string>;
  savedCount: number;
  sessionToken: string;
  isSaved: (id: string) => boolean;
  saveListingId: (id: string) => void;
  removeSavedId: (id: string) => void;
}

export function useSaved(): UseSavedReturn {
  const [sessionToken] = useState<string>(() => getOrCreateSessionToken());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => loadSavedIds());

  // Persist to localStorage whenever savedIds changes
  useEffect(() => {
    persistSavedIds(savedIds);
  }, [savedIds]);

  const isSaved = useCallback(
    (id: string): boolean => savedIds.has(id),
    [savedIds],
  );

  const saveListingId = useCallback(
    (id: string): void => {
      setSavedIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      // Fire-and-forget server sync when not in mock mode
      saveListing(sessionToken, id).catch((err) => {
        console.warn('Failed to sync save to server:', err);
      });
    },
    [sessionToken],
  );

  const removeSavedId = useCallback(
    (id: string): void => {
      setSavedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Fire-and-forget server sync
      unsaveListing(sessionToken, id).catch((err) => {
        console.warn('Failed to sync remove to server:', err);
      });
    },
    [sessionToken],
  );

  return {
    savedIds,
    savedCount: savedIds.size,
    sessionToken,
    isSaved,
    saveListingId,
    removeSavedId,
  };
}
