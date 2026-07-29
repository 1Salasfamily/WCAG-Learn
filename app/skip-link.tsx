"use client";

// Where "Skip to main content" should land right now. In the quiz, the
// question card (or the results card on the summary); in the guide, the
// status line — it speaks the position and criterion title ("Viewing 12 of
// 56: …") on arrival, exactly what a screen-reader user needs to hear. The
// static pages fall back to the main region. Every target carries a static
// id and tabindex="-1" so a NATIVE fragment navigation can land on it —
// VoiceOver follows real hash navigation far more reliably than any
// programmatic focus() call, which it ignored from this link in testing.
function currentTarget(): HTMLElement | null {
  return (
    document.getElementById("quiz-question") ??
    document.getElementById("quiz-results") ??
    document.getElementById("study-status") ??
    document.getElementById("main-content")
  );
}

export default function SkipLink() {
  // Repoint the href at the live target before the browser runs the
  // activation's default action, so the native jump goes to the right place.
  function retarget(event: { currentTarget: HTMLAnchorElement }) {
    const target = currentTarget();
    if (target) {
      event.currentTarget.setAttribute("href", `#${target.id}`);
    }
  }

  // Backstop for re-activations: navigating to a hash the URL already has
  // doesn't re-focus the target, so focus it directly if the native
  // navigation didn't. Delayed a beat so VoiceOver has finished processing
  // the activation before focus moves.
  function ensureFocus() {
    const target = currentTarget();
    if (!target) return;
    window.setTimeout(() => {
      if (document.activeElement !== target) {
        target.focus();
      }
    }, 120);
  }

  return (
    <a
      className="skip-link"
      href="#main-content"
      onMouseDown={retarget}
      onClick={(event) => {
        retarget(event);
        ensureFocus();
      }}
      onKeyDown={(event) => {
        retarget(event);
        // Links don't activate on Space natively; run the same fragment
        // navigation by hand.
        if (event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          const target = currentTarget();
          if (target) {
            window.location.hash = target.id;
            ensureFocus();
          }
        }
      }}
    >
      Skip to main content
    </a>
  );
}
