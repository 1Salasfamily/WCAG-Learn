"use client";

export default function SkipLink() {
  function skipToMain(event: { preventDefault: () => void }) {
    event.preventDefault();
    // Land on the study card itself when one is on screen — the question
    // card in quiz mode, the criterion card in the guide, the results card
    // on the summary. The intervening chrome (menu button, mode toggle,
    // filters) is exactly what a skip link exists to skip. Same target
    // chain as the app's discrete jumps (focusCriterionCard). The start
    // screen and the static pages fall back to the main region.
    const target =
      document.querySelector<HTMLElement>(".reference-topbar") ??
      document.querySelector<HTMLElement>(".quiz-card") ??
      document.querySelector<HTMLElement>(".quiz-summary") ??
      document.querySelector<HTMLElement>(".learn-main") ??
      document.getElementById("main-content");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    const stage = document.querySelector<HTMLElement>(".main-stage");
    if (stage && stage.contains(target)) {
      // Present from the top of the stage so anything above the card (the
      // tag filter chip) stays in view — the app-wide presentation contract.
      target.focus({ preventScroll: true });
      stage.scrollTo(0, 0);
    } else {
      target.focus();
      target.scrollIntoView({ block: "start" });
    }
  }

  return (
    <a
      className="skip-link"
      href="#main-content"
      onClick={skipToMain}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Spacebar") {
          skipToMain(event);
        }
      }}
    >
      Skip to main content
    </a>
  );
}
