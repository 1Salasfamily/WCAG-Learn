"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Criterion } from "./wcag";

type ImageOverlayProps = {
  criterion: Criterion;
  imageSrc: string;
  onClose: () => void;
};

function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab") return;
  const focusables = event.currentTarget.querySelectorAll<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function ImageOverlay({
  criterion,
  imageSrc,
  onClose
}: ImageOverlayProps) {
  return (
    <div
      className="example-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Expanded example for ${criterion.id} ${criterion.title}`}
      onClick={onClose}
      onKeyDown={trapFocus}
    >
      <div
        className="example-overlay-image-wrap"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          className="example-overlay-image"
          src={imageSrc}
          alt={`Expanded example visual for ${criterion.id} ${criterion.title}`}
        />
      </div>
      <button className="start-button overlay-close" onClick={onClose} autoFocus>
        Close
      </button>
    </div>
  );
}
