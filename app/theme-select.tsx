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

// Appearance control, bottom right of the global footer. A native select:
// keyboard, VoiceOver and color-scheme all come free, and the quiz filters
// already style one, so it reuses their classes rather than duplicating
// the rules. The footer stays visible on landscape phones while the
// header hides, so the choice is reachable mid-study everywhere.
const OPTIONS: Array<{ pref: ThemePref; label: string }> = [
  { pref: "system", label: "Auto" },
  { pref: "light", label: "Light" },
  { pref: "dark", label: "Dark" }
];

export default function ThemeSelect() {
  // The server cannot know the preference; render "system" and correct on
  // mount. The no-flash script has already put the resolved theme on
  // <html>, so nothing visible changes here except the selected option.
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
    <label className="quiz-filter footer-appearance">
      <span className="quiz-filter-label">Appearance</span>
      <span className="quiz-select-shell">
        <select
          className="quiz-filter-select"
          value={pref}
          onChange={(event) => choose(event.target.value as ThemePref)}
        >
          {OPTIONS.map(({ pref: option, label }) => (
            <option key={option} value={option}>
              {label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
