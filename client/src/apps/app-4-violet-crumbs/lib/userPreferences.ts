import { DIETARY_TAGS } from './types';

const STORAGE_KEY = 'sternbites_dietary_preferences';

export type DietaryPreference = typeof DIETARY_TAGS[number];

export const getUserDietaryPreferences = (): DietaryPreference[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const setUserDietaryPreferences = (prefs: DietaryPreference[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};
