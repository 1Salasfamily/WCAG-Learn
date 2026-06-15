import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility — WCAG Learn",
  description:
    "How WCAG Learn approaches accessibility: tested with automated tools, zoom, contrast, text spacing, VoiceOver, and keyboard navigation; conforms to WCAG 2.2 AA."
};

const testedWith = [
  "Automated accessibility tools (axe)",
  "Browser zoom",
  "Color contrast",
  "Text spacing",
  "VoiceOver on macOS Tahoe 26.5.1",
  "Keyboard navigation"
];

export default function AccessibilityPage() {
  return (
    <div className="about-page">
      <article className="about-inner">
        <Link className="about-back" href="/">
          <span aria-hidden="true">←</span> Back to the study app
        </Link>

        <h2 className="about-title">Accessibility</h2>

        <p className="about-lead">
          WCAG Learn is a tool for learning accessibility, so it&apos;d be a bit
          awkward if the app itself wasn&apos;t accessible. We built it to be as
          accessible and usable as we possibly can — for everyone, however you
          browse.
        </p>

        <section className="about-section">
          <h3>Where things stand</h3>
          <p>
            The app aims to conform to the <strong>WCAG 2.2 AA</strong> standard.
            It&apos;s also very much a work in progress — we&apos;re always
            poking at it and smoothing out rough edges, so think of this as a
            living effort rather than a finished stamp.
          </p>
        </section>

        <section className="about-section">
          <h3>How we&apos;ve tested it</h3>
          <p>To keep it honest, we check the app with:</p>
          <ul className="about-links">
            {testedWith.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <h3>Found something? Let us know</h3>
          <p>
            No app is perfect, and real-world use always surfaces things our
            testing misses. If something trips you up — or you&apos;ve got an
            idea to make this better — we&apos;d genuinely love to hear it.
            Reach out with suggestions and help us improve it.
          </p>
          <ul className="about-links">
            <li>
              <a
                href="https://github.com/1Salasfamily/WCAG-Learn/issues"
                target="_blank"
                rel="noreferrer"
              >
                Share feedback or open an issue on GitHub
                <span aria-hidden="true"> ↗</span>
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
