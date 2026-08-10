"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    // aria-modal alone does not stop iOS VoiceOver's reading cursor from
    // swiping into the background, so everything behind the overlay is made
    // inert (out of the accessibility tree and focus order) while it is
    // open. aria-hidden rides along for browsers predating inert. Runs
    // after mount, so the Close button's autoFocus has already landed
    // inside the overlay before its old container goes inert.
    const others = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".site-header, .site-footer, .skip-link, .learn-main, .learn-sidebar, .sidebar-backdrop"
      )
    );
    others.forEach((el) => {
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    });
    return () => {
      // Restored before the app moves focus back to the image trigger.
      others.forEach((el) => {
        el.inert = false;
        el.removeAttribute("aria-hidden");
      });
    };
  }, []);

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
          alt={`Example for ${criterion.id} ${criterion.title}: an accessible version beside a violation. Close this view to read the pass and fail examples as text on the card.`}
        />
      </div>
      <button className="start-button overlay-close" onClick={onClose} autoFocus>
        Close
      </button>
    </div>
  );
}
