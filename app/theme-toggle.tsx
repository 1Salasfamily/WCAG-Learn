"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  readPref,
  resolveTheme,
  savePref,
  systemTheme,
  type ThemePref
} from "./theme";

// Appearance control in the site header. Three explicit choices rather
// than a cycling button, so the current state is visible and each option
// is its own pressed/not-pressed target. Same segmented pattern as the
// study-mode toggle on the page, so it reads as native to the app.
const OPTIONS: Array<{ pref: ThemePref; label: string }> = [
  { pref: "light", label: "Light" },
  { pref: "dark", label: "Dark" },
  { pref: "system", label: "Auto" }
];

export default function ThemeToggle() {
  // The server cannot know the preference; render "system" and correct on
  // mount. The no-flash script has already set the resolved theme on
  // <html>, so nothing visible changes here except which button is pressed.
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    setPref(readPref());
  }, []);

  // Following the OS means re-following it when it changes mid-session.
  useEffect(() => {
    if (pref !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    function onChange() {
      applyTheme(systemTheme());
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [pref]);

  function choose(next: ThemePref) {
    setPref(next);
    savePref(next);
    applyTheme(resolveTheme(next));
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Appearance">
      {OPTIONS.map(({ pref: option, label }) => {
        const active = pref === option;
        return (
          <button
            key={option}
            type="button"
            className={`theme-toggle-button ${active ? "active" : ""}`}
            aria-pressed={active}
            onClick={() => choose(option)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
