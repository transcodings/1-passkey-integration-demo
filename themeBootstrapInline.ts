/**
 * Blocking snippet: set `<html data-theme="dark"|"light">` before hydration.
 * Must mirror {@link ThemeProvider} resolution logic.
 *
 * Uses `data-theme` (not `class="dark"`) because Next/App Router resets `html.className` on
 * hydrate, which removed `.dark` and broke Tailwind `dark:` utilities.
 */
import {
  DemoResolvedThemeMode,
  DemoThemeHtmlDataAttribute,
  DemoThemePreference,
  DemoThemeStorageKey,
} from './constants';

/** Minified script string for `dangerouslySetInnerHTML`. */
export function themeBootstrapInlineScript(): string {
  const keyJson = JSON.stringify(DemoThemeStorageKey.Preference);
  const attrJson = JSON.stringify(DemoThemeHtmlDataAttribute.Key);
  const darkVal = JSON.stringify(DemoThemePreference.Dark);
  const lightVal = JSON.stringify(DemoThemePreference.Light);
  const modeDark = JSON.stringify(DemoResolvedThemeMode.Dark);
  const modeLight = JSON.stringify(DemoResolvedThemeMode.Light);
  return `(function(){try{var r=document.documentElement;var p=localStorage.getItem(${keyJson});var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;var mode;if(p===${darkVal})mode=${modeDark};else if(p===${lightVal})mode=${modeLight};else mode=sys?${modeDark}:${modeLight};r.setAttribute(${attrJson},mode);}catch(e){}})();`;
}
