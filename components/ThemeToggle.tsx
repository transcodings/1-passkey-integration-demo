'use client';

import { useDemoTheme } from '@/components/ThemeProvider';
import { DemoThemePreference } from '@/constants';

/** Segmented appearance control: light, system (OS), dark. */
export function ThemeToggle() {
  const { preference, setPreference, mounted, resolved } = useDemoTheme();

  const baseBtn =
    'inline-flex shrink-0 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 disabled:opacity-60';

  return (
    <div
      className="rounded-lg border border-zinc-300 bg-white/95 p-0.5 shadow-sm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95"
      role="group"
      aria-label={
        mounted
          ? `Color theme (${resolved}), preference ${preference}`
          : 'Color theme'
      }
    >
      <fieldset className="flex gap-0.5 border-0 p-0">
        <legend className="sr-only">Color theme</legend>
        <button
          type="button"
          disabled={!mounted}
          aria-pressed={preference === DemoThemePreference.Light}
          aria-label="Light mode"
          onClick={() => setPreference(DemoThemePreference.Light)}
          className={`${baseBtn} ${
            preference === DemoThemePreference.Light
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <SunIcon aria-hidden />
          Light
        </button>
        <button
          type="button"
          disabled={!mounted}
          aria-pressed={preference === DemoThemePreference.System}
          aria-label="Match system appearance"
          onClick={() => setPreference(DemoThemePreference.System)}
          className={`${baseBtn} ${
            preference === DemoThemePreference.System
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <MonitorIcon aria-hidden />
          Auto
        </button>
        <button
          type="button"
          disabled={!mounted}
          aria-pressed={preference === DemoThemePreference.Dark}
          aria-label="Dark mode"
          onClick={() => setPreference(DemoThemePreference.Dark)}
          className={`${baseBtn} ${
            preference === DemoThemePreference.Dark
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <MoonIcon aria-hidden />
          Dark
        </button>
      </fieldset>
    </div>
  );
}

function SunIcon({ 'aria-hidden': ah }: { 'aria-hidden'?: boolean }) {
  return (
    <svg
      aria-hidden={ah}
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ 'aria-hidden': ah }: { 'aria-hidden'?: boolean }) {
  return (
    <svg
      aria-hidden={ah}
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon({ 'aria-hidden': ah }: { 'aria-hidden'?: boolean }) {
  return (
    <svg
      aria-hidden={ah}
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
