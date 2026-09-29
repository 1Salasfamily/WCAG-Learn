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

// Puts a preference on the page: the resolved theme on <html>, and the
// browser-chrome colour. With an explicit choice both theme-color metas
// carry that theme's colour; on Auto each meta goes back to the colour for
// its own media query, so the browser follows the OS by itself.
export function applyPref(pref: ThemePref) {
  const theme = resolveTheme(pref);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // Native controls, scrollbars and form fields follow.
  root.style.colorScheme = theme;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      const own: Theme = meta.media.includes("light") ? "light" : "dark";
      meta.setAttribute("content", THEME_COLORS[pref === "system" ? own : theme]);
    });
}

// readPref + applyPref as one self-contained statement for the no-flash
// script, built from the same constants. Only the storage read sits in the
// try: if storage is blocked the preference is Auto and the OS still
// decides, rather than the page falling back to the dark :root tokens.
export const NO_FLASH_SCRIPT = `(function(){var v=null;try{v=localStorage.getItem(${JSON.stringify(
  THEME_KEY
)})}catch(e){}var p=v==="light"||v==="dark"?v:"system",t=p!=="system"?p:(window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"),c=${JSON.stringify(
  THEME_COLORS
)},r=document.documentElement;r.setAttribute("data-theme",t);r.style.colorScheme=t;var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].setAttribute("content",c[p==="system"?(m[i].media.indexOf("light")>-1?"light":"dark"):t])}})();`;
