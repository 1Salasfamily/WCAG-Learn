"use client";

import { useEffect, useRef, useState } from "react";
import type { Criterion } from "./wcag";
import { criterionShareUrl } from "./share-url";

// The confirmation replaces the label in place, then reverts — a permanent
// "Link copied" would be clutter on a row that already carries the id,
// title, level, and tags.
const CONFIRM_MS = 2600;

type ShareState = "idle" | "copied" | "failed";

// Coarse pointers get the OS share sheet (the expected way to pass a link
// along on a phone); everything else copies, which is what a desktop user
// expects from a control labelled Share. navigator.share exists on some
// desktop browsers too, hence the pointer check rather than bare detection.
function prefersShareSheet() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

// Clipboard API needs a secure context and permission; the textarea route is
// the fallback for the cases where it is missing or throws.
async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path rather than failing outright.
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

export default function ShareCriterionButton({
  criterion
}: {
  criterion: Criterion;
}) {
  const [state, setState] = useState<ShareState>("idle");
  const timerRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // A new card is a new share target, so a confirmation left over from the
  // previous criterion must not carry across.
  useEffect(() => {
    clearTimer();
    setState("idle");
  }, [criterion.id]);

  useEffect(() => clearTimer, []);

  async function share() {
    const url = criterionShareUrl(criterion.id);
    if (prefersShareSheet()) {
      try {
        await navigator.share({
          title: `WCAG ${criterion.id} ${criterion.title}`,
          url
        });
      } catch {
        // Dismissing the sheet rejects — that is a cancel, not a failure,
        // and the OS has already shown its own UI either way.
      }
      return;
    }
    const ok = await copyText(url);
    clearTimer();
    setState(ok ? "copied" : "failed");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setState("idle");
    }, CONFIRM_MS);
  }

  const label =
    state === "copied"
      ? "Link copied"
      : state === "failed"
        ? "Copy failed"
        : "Share";

  return (
    <>
      <button
        className={`share-criterion ${state !== "idle" ? `share-${state}` : ""}`}
        onClick={share}
        type="button"
      >
        {state === "copied" ? (
          <span aria-hidden="true">✓</span>
        ) : (
          <svg
            className="share-criterion-icon"
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.2 1.2" />
            <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.2-1.2" />
          </svg>
        )}
        {label}
        {/* Keeps the accessible name specific ("Share 1.4.5 Images of
            Text") while the visible label stays short. The name still
            starts with the visible text, so 2.5.3 holds in every state. */}
        <span className="visually-hidden">
          {" "}
          {criterion.id} {criterion.title}
        </span>
      </button>
      {/* The label change alone is not reliably announced, so the outcome
          gets its own polite status. Empty while idle so nothing is spoken
          on arrival or when the confirmation times out. */}
      <span role="status" className="visually-hidden">
        {state === "copied"
          ? `Link to ${criterion.id} ${criterion.title} copied to the clipboard.`
          : state === "failed"
            ? "Copying the link failed. Copy it from the address bar instead."
            : ""}
      </span>
    </>
  );
}
