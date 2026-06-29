"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AppState = { started: boolean; viewMode: "reference" | "quiz" };

export default function ResetButton() {
  const pathname = usePathname();
  const [state, setState] = useState<AppState>({ started: false, viewMode: "reference" });

  useEffect(() => {
    function onStateChange(event: Event) {
      setState((event as CustomEvent<AppState>).detail);
    }

    window.addEventListener("wcag-learn:state", onStateChange);
    return () => window.removeEventListener("wcag-learn:state", onStateChange);
  }, []);

  function handleReset() {
    window.dispatchEvent(new Event("wcag-learn:reset"));
  }

  // Reset only applies to the quiz, so the button lives only in quiz mode.
  if (pathname !== "/" || !state.started || state.viewMode !== "quiz") {
    return null;
  }

  return (
    <button type="button" className="start-button nav-reset" onClick={handleReset}>
      Reset
    </button>
  );
}
