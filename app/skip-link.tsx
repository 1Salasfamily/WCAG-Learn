"use client";

export default function SkipLink() {
  function skipToMain(event: { preventDefault: () => void }) {
    event.preventDefault();
    const target =
      document.querySelector<HTMLElement>(".learn-main") ??
      document.getElementById("main-content");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus();
    target.scrollIntoView({ block: "start" });
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
