"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { applyPref, readPref, savePref, THEME_KEY, type ThemePref } from "./theme";

// Theme control: a round button in the site header, drawn at the logo's
// height, that opens a three-item menu. A menu the page draws rather than a
// native <select>, so the keys behave the same in every browser (the macOS
// popup ignores Space): Space or Enter opens it and picks, arrows move,
// Escape closes, Tab closes and moves on. The icon alone shows the choice;
// the accessible name carries it in words ("Theme: Auto").
//
// Two copies render: one in the header, and one in the study top row for
// landscape phones, where the header hides (CSS shows one at a time). They
// share one preference so both icons always agree.

const OPTIONS: Array<{ pref: ThemePref; label: string }> = [
  { pref: "system", label: "Auto" },
  { pref: "light", label: "Light" },
  { pref: "dark", label: "Dark" }
];

let shared: ThemePref = "system";
const listeners = new Set<() => void>();

function setShared(next: ThemePref) {
  shared = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function ThemeIcon({ pref }: { pref: ThemePref }) {
  if (pref === "light") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55" />
      </svg>
    );
  }
  if (pref === "dark") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M20 14.6A8.3 8.3 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6z" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.75a8.25 8.25 0 0 1 0 16.5z" fill="currentColor" />
    </svg>
  );
}

type ThemeMenuProps = {
  // The header copy, always mounted in the layout, owns the page-level
  // wiring; the top-row copy only reads and sets the shared choice.
  primary?: boolean;
  className?: string;
};

export default function ThemeMenu({ primary = false, className }: ThemeMenuProps) {
  // The server cannot know the preference; both render "system" and the
  // primary copy corrects it on mount. The no-flash script has already put
  // the resolved theme on <html>, so only the icon changes.
  const pref = useSyncExternalStore(subscribe, () => shared, () => "system" as ThemePref);
  const pathname = usePathname();

  // Adopt the stored choice on mount and whenever another tab changes it.
  useEffect(() => {
    if (!primary) return;
    function sync() {
      const stored = readPref();
      setShared(stored);
      applyPref(stored);
    }
    sync();
    function onStorage(event: StorageEvent) {
      if (event.key === THEME_KEY || event.key === null) sync();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [primary]);

  // Next re-renders the theme-color metas from the viewport config on each
  // client-side navigation, resetting them to one colour per media query.
  // With an explicit choice that is wrong, so put the choice back.
  useEffect(() => {
    if (primary) applyPref(readPref());
  }, [primary, pathname]);

  // Following the OS means re-following it when it changes mid-session.
  useEffect(() => {
    if (!primary || pref !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    function onChange() {
      applyPref("system");
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [primary, pref]);

  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const current = OPTIONS.find((option) => option.pref === pref) ?? OPTIONS[0];

  useEffect(() => {
    if (open) itemRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  // A press anywhere outside closes it, without moving focus.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openAt(index: number) {
    setFocusIndex(index);
    setOpen(true);
  }

  function closeToButton() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function choose(next: ThemePref) {
    setShared(next);
    savePref(next);
    applyPref(next);
    closeToButton();
  }

  function onButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(OPTIONS.length - 1);
    }
  }

  function onItemKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const last = OPTIONS.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last
    };
    if (event.key in moves) {
      event.preventDefault();
      setFocusIndex(moves[event.key]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeToButton();
    } else if (event.key === "Tab") {
      // Close and hand focus back to the button first, so the browser's own
      // Tab (or Shift+Tab) carries on from there to the next control.
      closeToButton();
    }
    // Space and Enter reach the item's own click.
  }

  return (
    <div
      ref={wrapRef}
      className={`theme-menu-wrap ${className ?? ""}`}
      onBlur={(event) => {
        if (open && !wrapRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="start-button theme-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Theme: ${current.label}`}
        onClick={() => (open ? setOpen(false) : openAt(OPTIONS.indexOf(current)))}
        onKeyDown={onButtonKeyDown}
      >
        <ThemeIcon pref={pref} />
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label="Theme" className="theme-menu">
          {OPTIONS.map((option, index) => (
            <button
              key={option.pref}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={option.pref === pref}
              tabIndex={-1}
              className="theme-menu-item"
              onClick={() => choose(option.pref)}
              onKeyDown={(event) => onItemKeyDown(event, index)}
            >
              <ThemeIcon pref={option.pref} />
              <span>{option.label}</span>
              <span className="theme-menu-check" aria-hidden="true">
                ✓
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
