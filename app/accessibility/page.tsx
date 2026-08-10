import type { Metadata } from "next";
import Link from "next/link";
import FeedbackForm from "../FeedbackForm";

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
          awkward if the app itself wasn&apos;t accessible. It has been built to
          be as accessible and usable as possible.
        </p>

        <section className="about-section">
          <h3>Where things stand as of June 15, 2026.</h3>
          <p>
            The app aims to conform to the <strong>WCAG 2.2 AA</strong> standard.
            It&apos;s also very much a work in progress, we&apos;re always poking
            at it and smoothing out rough edges, so think of this as a living
            effort rather than a finished stamp.
          </p>
        </section>

        <section className="about-section">
          <h3>How we&apos;ve tested it</h3>
          <p>Our methodology covers:</p>
          <ul className="about-links">
            {testedWith.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <h3>Hit a barrier? Report it here</h3>
          <p>
            We strive to always improve the usability of this product, so if
            something trips you up — with a screen reader, the keyboard,
            zoom, or anything else — we&apos;d genuinely love to hear it.
            Reports like these directly shape the app.
          </p>
          <FeedbackForm
            legend="What kind of barrier did you hit?"
            types={[
              "Screen reader issue",
              "Keyboard navigation issue",
              "Visual or contrast issue",
              "Other barrier"
            ]}
            subject="WCAG Learn accessibility report"
            messageLabel="Describe the barrier (required)"
            messageHint="What you were trying to do, what happened, and the assistive technology or input method you were using."
            messageErrorText="Please describe the barrier before sending."
            successBody="We read every report — accessibility barriers go to the top of the list. If you left your email, you'll hear back."
          />
          <p className="feedback-hint feedback-alt-channel">
            Prefer GitHub?{" "}
            <a
              href="https://github.com/1Salasfamily/WCAG-Learn/issues"
              target="_blank"
              rel="noreferrer"
            >
              Open an issue
              <span aria-hidden="true"> ↗</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </p>
        </section>
      </article>
    </div>
  );
}
