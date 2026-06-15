import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About & sources — WCAG Learn",
  description:
    "How WCAG Learn uses the official W3C WCAG 2.2 specification for accuracy and reliability."
};

const sources = [
  {
    label: "WCAG 2.2 Recommendation (the standard itself)",
    href: "https://www.w3.org/TR/WCAG22/"
  },
  {
    label: "How to Meet WCAG (Quick Reference)",
    href: "https://www.w3.org/WAI/WCAG22/quickref/"
  },
  {
    label: "W3C Web Accessibility Initiative (WAI) overview",
    href: "https://www.w3.org/WAI/standards-guidelines/wcag/"
  }
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <article className="about-inner">
        <Link className="about-back" href="/">
          <span aria-hidden="true">←</span> Back to the study app
        </Link>

        <h2 className="about-title">About WCAG Learn &amp; our sources</h2>

        <p className="about-lead">
          WCAG Learn is a study and quick-reference tool for the Web Content
          Accessibility Guidelines (WCAG) 2.2, Levels A and AA.
        </p>

        <section className="about-section">
          <h3>Where the content comes from</h3>
          <p>
            Every criterion, explanation, and example in this app is based on
            the official <strong>W3C WCAG 2.2 specification</strong> — developed
            and published by the World Wide Web Consortium (W3C) through its{" "}
            <strong>Web Accessibility Initiative (WAI)</strong>. The W3C is the
            international standards body responsible for WCAG, and its documents
            are the authoritative source of truth.
          </p>
        </section>

        <section className="about-section">
          <h3>How we keep it accurate and reliable</h3>
          <p>
            We distill the W3C&apos;s normative success criteria into
            plain-language explanations, pass/fail examples, and illustrations
            so they are easier to learn — without changing their meaning. The
            wording is simplified for study; the requirements are not. For
            formal audits and conformance decisions, always refer to the
            official W3C documents linked below, which take precedence over any
            summary here.
          </p>
        </section>

        <section className="about-section">
          <h3>Official W3C sources</h3>
          <ul className="about-links">
            {sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noreferrer">
                  {source.label}
                  <span aria-hidden="true"> ↗</span>
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
