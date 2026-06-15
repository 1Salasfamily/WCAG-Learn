"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetButton() {
  const pathname = usePathname();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    function onStartedChange(event: Event) {
      setStarted((event as CustomEvent<boolean>).detail);
    }

    window.addEventListener("wcag-learn:started", onStartedChange);
    return () => window.removeEventListener("wcag-learn:started", onStartedChange);
  }, []);

  function handleReset() {
    window.dispatchEvent(new Event("wcag-learn:reset"));
  }

  if (pathname !== "/" || !started) {
    return null;
  }

  return (
    <button type="button" className="start-button nav-reset" onClick={handleReset}>
      Reset
    </button>
  );
}
