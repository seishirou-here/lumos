import { useSyncExternalStore } from 'react';

export type Theme = 'sakura' | 'forest';

export const THEME_STORAGE_KEY = 'lumos-theme';

const DEFAULT_THEME: Theme = 'sakura';

export const THEME_META: Record<
  Theme,
  { label: string; emoji: string; themeColor: string; hint: string }
> = {
  sakura: {
    label: 'Sakura',
    emoji: '🌸',
    themeColor: '#09090b',
    hint: 'Kuro Sakura · obsidian & kelopak rose',
  },
  forest: {
    label: 'Forest',
    emoji: '🌿',
    themeColor: '#090a09',
    hint: 'Kuro Midori · slate botanikal & emerald',
  },
};

function isTheme(value: string | null): value is Theme {
  return value === 'sakura' || value === 'forest';
}

/** Read the persisted theme, falling back to Sakura on any storage failure. */
export function readTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function syncBrowserChrome(theme: Theme) {
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_META[theme].themeColor);
}

/** Stamp the theme on <html> so every CSS token switches at once. */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = 'dark';
  syncBrowserChrome(theme);
}

let activeTheme: Theme | null = null;
let storageListenerAttached = false;
const listeners = new Set<() => void>();

function currentTheme(): Theme {
  if (activeTheme === null) activeTheme = readTheme();
  return activeTheme;
}

function notify() {
  listeners.forEach((listener) => listener());
}

/** Apply and persist a theme, then notify every subscriber. */
export function setTheme(next: Theme) {
  if (currentTheme() === next) return;

  activeTheme = next;
  applyTheme(next);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private mode / blocked storage: the theme still applies for this session.
  }

  notify();
}

export function toggleTheme() {
  setTheme(currentTheme() === 'sakura' ? 'forest' : 'sakura');
}

/**
 * Boot the store. Safe to call twice: the pre-paint inline script in
 * index.html already set the attribute, this keeps React's snapshot in sync.
 */
export function initTheme(): Theme {
  const theme = readTheme();
  activeTheme = theme;
  applyTheme(theme);

  if (typeof window !== 'undefined' && !storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener('storage', (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;

      const next = isTheme(event.newValue) ? event.newValue : DEFAULT_THEME;
      activeTheme = next;
      applyTheme(next);
      notify();
    });
  }

  return theme;
}

function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => DEFAULT_THEME);

  return { theme, setTheme, toggleTheme };
}
