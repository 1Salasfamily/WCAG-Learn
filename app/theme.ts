// The appearance choice. Three preferences, two resolved themes.
//
// The resolved theme lives on <html data-theme="light|dark">, set before
// first paint by the inline script in layout.tsx and kept current by the
// toggle. Everything themed reads tokens off that attribute, including the
// inlined illustrations, which is the reason they are inlined: an <img>
// cannot see it. "system" means follow the operating system and re-follow
// it if it changes while the page is open.

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_KEY = "wcag-learn:theme:v1";

// Matches --bg in each theme; drives the browser's own chrome colour.
export const THEME_COLORS: Record<Theme, string> = {
  dark: "#0f1115",
  light: "#eceff5"
};

export function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function savePref(pref: ThemePref) {
  try {
    if (pref === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Storage unavailable: the choice still applies for this page view.
  }
}

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolveTheme(pref: ThemePref): Theme {
  return pref === "system" ? systemTheme() : pref;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // Native controls, scrollbars and form fields follow.
  root.style.colorScheme = theme;
  // Next renders one theme-color meta per scheme; when the choice is
  // explicit, both must say the same thing or the chrome disagrees.
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_COLORS[theme]));
}

// The same logic as the exported functions, as one self-contained
// statement for the no-flash script. Kept here so the two cannot drift.
export const NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_KEY
)},v=localStorage.getItem(k),t=v==="light"||v==="dark"?v:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var r=document.documentElement;r.setAttribute("data-theme",t);r.style.colorScheme=t;}catch(e){}})();`;
