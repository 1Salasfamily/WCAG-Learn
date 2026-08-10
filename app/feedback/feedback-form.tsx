"use client";

import { useRef, useState } from "react";
import Link from "next/link";

// Same-origin proxy to Formspree (rewrite in next.config.mjs). Posting to
// our own origin keeps the site's CSP locked to 'self' — a direct
// formspree.io request would be blocked by our own connect-src — and makes
// the form immune to ad blockers that filter formspree.io. The no-JS
// fallback POSTs natively to the same path through the same rewrite.
const ENDPOINT = "/api/feedback";

const FEEDBACK_TYPES = [
  "General feedback",
  "Bug or problem",
  "Content correction",
  "Feature idea"
];

type Status = "idle" | "sending" | "sent" | "failed";

export default function FeedbackForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [failDetail, setFailDetail] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(FEEDBACK_TYPES[0]);
  const [messageError, setMessageError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = String(data.get("message") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();

    // 3.3.1 / 3.3.3: identify the field in text and say how to fix it; focus
    // moves to the first field with a problem (deferred a frame, the app-wide
    // pattern VoiceOver follows).
    const badMessage = message.length === 0;
    const badEmail = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email);
    setMessageError(badMessage);
    setEmailError(badEmail);
    if (badMessage || badEmail) {
      requestAnimationFrame(() => {
        (badMessage ? messageRef.current : emailRef.current)?.focus();
      });
      return;
    }

    setStatus("sending");
    setFailDetail(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Formspree rejected the submission (${response.status}): ${detail.slice(0, 200)}`
        );
      }
      setStatus("sent");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      // The form and everything typed into it stay intact for a retry. The
      // failure class is surfaced in the banner so a report of "it failed"
      // carries its own diagnosis: a TypeError means the request never left
      // the browser (content blocker, or a sandboxed preview); anything
      // else is Formspree's own answer.
      console.error("Feedback submission failed:", error);
      setFailDetail(
        error instanceof TypeError
          ? "The request to formspree.io never left your browser — usually an ad/privacy blocker, or a sandboxed preview window."
          : error instanceof Error
            ? error.message
            : String(error)
      );
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return (
      <div className="feedback-success" ref={successRef} tabIndex={-1}>
        <h3>
          <span aria-hidden="true">✓</span> Feedback sent — thank you
        </h3>
        <p>
          We read every message. If you left your email and asked a question,
          you&apos;ll hear back.
        </p>
        <Link className="about-back" href="/">
          <span aria-hidden="true">←</span> Back to the study app
        </Link>
      </div>
    );
  }

  return (
    <form
      className="feedback-form"
      action={ENDPOINT}
      method="POST"
      noValidate
      onSubmit={handleSubmit}
    >
      {/* Custom ARIA radiogroup instead of native radios: Justin's spec is
          one Tab stop PER option in reading order, and browsers force
          same-name native radios to a single group stop (explicit tabindex
          cannot override it). Buttons with role="radio" are each a real Tab
          stop; Space/Enter select; arrow keys also move selection for users
          who expect the native pattern. The hidden input below carries the
          value, so the submitted form is unchanged. */}
      <fieldset className="feedback-fieldset">
        <legend id="feedback-type-legend">What kind of feedback is this?</legend>
        <div role="radiogroup" aria-labelledby="feedback-type-legend">
          {FEEDBACK_TYPES.map((type, index) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selectedType === type}
              className="feedback-radio-row"
              onClick={() => setSelectedType(type)}
              onKeyDown={(event) => {
                const forward =
                  event.key === "ArrowDown" || event.key === "ArrowRight";
                const backward =
                  event.key === "ArrowUp" || event.key === "ArrowLeft";
                if (!forward && !backward) return;
                event.preventDefault();
                const next =
                  (index + (forward ? 1 : -1) + FEEDBACK_TYPES.length) %
                  FEEDBACK_TYPES.length;
                setSelectedType(FEEDBACK_TYPES[next]);
                // Focus follows selection, matching native radio arrows.
                const group = event.currentTarget.parentElement;
                (group?.children[next] as HTMLElement | undefined)?.focus();
              }}
            >
              <span className="feedback-radio-circle" aria-hidden="true" />
              {type}
              <span className="feedback-radio-check" aria-hidden="true">
                ✓
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="type" value={selectedType} />

      <div className="feedback-field">
        <label htmlFor="feedback-message">Your feedback (required)</label>
        <p className="feedback-hint" id="feedback-message-hint">
          What happened, what you expected, or what you&apos;d like to see.
        </p>
        <textarea
          className="feedback-textarea"
          id="feedback-message"
          name="message"
          ref={messageRef}
          aria-invalid={messageError || undefined}
          aria-describedby={`feedback-message-hint${
            messageError ? " feedback-message-error" : ""
          }`}
        />
        {messageError ? (
          <p className="feedback-error" id="feedback-message-error">
            <span aria-hidden="true">✗</span> Please enter your feedback before
            sending.
          </p>
        ) : null}
      </div>

      <div className="feedback-field">
        <label htmlFor="feedback-email">Email (optional)</label>
        <p className="feedback-hint" id="feedback-email-hint">
          Only if you&apos;d like a reply. Never shared, never used for
          anything else.
        </p>
        <input
          className="feedback-input"
          id="feedback-email"
          name="email"
          type="email"
          autoComplete="email"
          ref={emailRef}
          aria-invalid={emailError || undefined}
          aria-describedby={`feedback-email-hint${
            emailError ? " feedback-email-error" : ""
          }`}
        />
        {emailError ? (
          <p className="feedback-error" id="feedback-email-error">
            <span aria-hidden="true">✗</span> Please enter a valid email
            address, or leave the field empty.
          </p>
        ) : null}
      </div>

      {/* Formspree conventions: _subject titles the notification email;
          _gotcha is the honeypot — display:none removes it from the tab
          order and every accessibility tree, so only bots ever fill it. */}
      <input type="hidden" name="_subject" value="WCAG Learn feedback" />
      <input
        className="feedback-gotcha"
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <button
        className="feedback-submit"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send feedback"}
      </button>

      {status === "failed" ? (
        <div className="feedback-alert" role="alert">
          <p>
            <span aria-hidden="true">✗</span> Something went wrong sending
            your feedback. Your message is still here — please try again.
          </p>
          {failDetail ? (
            <p className="feedback-alert-detail">
              Technical detail: {failDetail}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
