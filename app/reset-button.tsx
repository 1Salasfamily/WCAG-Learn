"use client";

export default function ResetButton() {
  function handleReset() {
    window.dispatchEvent(new Event("wcag-learn:reset"));
  }

  return (
    <button type="button" className="start-button nav-reset" onClick={handleReset}>
      Reset
    </button>
  );
}
