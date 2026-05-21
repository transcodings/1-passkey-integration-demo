'use client';

import {
  DemoResolvedThemeMode,
  DemoThemeHtmlDataAttribute,
  DemoThemePreference,
  DemoThemeStorageKey,
} from '@/constants';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ResolvedDemoTheme = DemoResolvedThemeMode;

type ThemeContextValue = {
  preference: DemoThemePreference;
  setPreference: (next: DemoThemePreference) => void;
  mounted: boolean;
  resolved: ResolvedDemoTheme;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

function storedPreference(raw: string | null): DemoThemePreference {
  if (
    raw === DemoThemePreference.Light ||
    raw === DemoThemePreference.Dark ||
    raw === DemoThemePreference.System
  ) {
    return raw;
  }
  return DemoThemePreference.System;
}

function resolveEffective(
  preference: DemoThemePreference
): DemoResolvedThemeMode {
  if (preference === DemoThemePreference.Light) return DemoResolvedThemeMode.Light;
  if (preference === DemoThemePreference.Dark) return DemoResolvedThemeMode.Dark;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? DemoResolvedThemeMode.Dark
    : DemoResolvedThemeMode.Light;
}

/**
 * Writes `document.documentElement[DemoThemeHtmlDataAttribute.Key]` / `demo resolved mode`
 * and keeps it in sync with storage + `prefers-color-scheme` when preference is System.
 *
 * Uses a **data attribute** so theme survives React syncing `html.className` during hydration.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<DemoThemePreference>(
    DemoThemePreference.System
  );
  const [mounted, setMounted] = useState(false);

  const setPreference = useCallback((next: DemoThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(DemoThemeStorageKey.Preference, next);
    } catch {
      /* private mode etc. */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DemoThemeStorageKey.Preference);
      setPreferenceState(storedPreference(raw));
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    function applyResolvedThemeAttr() {
      const resolved = resolveEffective(preference);
      document.documentElement.setAttribute(
        DemoThemeHtmlDataAttribute.Key,
        resolved
      );
    }

    applyResolvedThemeAttr();

    if (preference !== DemoThemePreference.System) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyResolvedThemeAttr();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mounted, preference]);

  const resolved: ResolvedDemoTheme = useMemo(() => {
    if (!mounted || typeof window === 'undefined')
      return DemoResolvedThemeMode.Light;
    return resolveEffective(preference);
  }, [mounted, preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference,
      mounted,
      resolved,
    }),
    [preference, setPreference, mounted, resolved]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useDemoTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx)
    throw new Error('useDemoTheme must be used within ThemeProvider');
  return ctx;
}
