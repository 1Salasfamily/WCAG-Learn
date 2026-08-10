import type { Metadata } from "next";
import Link from "next/link";
import FeedbackForm from "./feedback-form";

export const metadata: Metadata = {
  title: "Send feedback — WCAG Learn",
  description:
    "Send feedback about WCAG Learn — bugs, confusing explanations, corrections, and ideas."
};

export default function FeedbackPage() {
  return (
    <div className="about-page">
      <article className="about-inner">
        <Link className="about-back" href="/">
          <span aria-hidden="true">←</span> Back to the study app
        </Link>

        <h2 className="about-title">Send feedback</h2>

        <p className="about-lead">
          Found a bug, hit something confusing, or have an idea? Tell us —
          feedback from real users is how this app gets better, and several of
          its features exist because someone wrote in.
        </p>

        <FeedbackForm />
      </article>
    </div>
  );
}
