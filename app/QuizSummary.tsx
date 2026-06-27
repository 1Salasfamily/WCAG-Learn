"use client";

import type { QuizQuestion } from "./wcag";

type QuizSummaryProps = {
  round: QuizQuestion[];
  score: number;
  onPracticeMisses: () => void;
  onNewRound: () => void;
  onReviewGuide: () => void;
};

export default function QuizSummary({
  round,
  score,
  onPracticeMisses,
  onNewRound,
  onReviewGuide
}: QuizSummaryProps) {
  return (
    <section className="quiz-summary" aria-label="Quiz round results">
      <p className="quiz-summary-kicker">Round complete</p>
      <p className="quiz-summary-score">
        {score} / {round.length}
      </p>
      <p className="quiz-summary-message">
        {score === round.length
          ? "Perfect round!"
          : score >= 8
            ? "Excellent — almost flawless."
            : score >= 6
              ? "Solid work. Review the misses below."
              : score >= 4
                ? "Getting there — keep practicing."
                : "Tough round. The reference guide is one click away."}
      </p>
      <ul
        className="quiz-summary-list"
        tabIndex={0}
        aria-label="Question-by-question results"
      >
        {round.map((q) => (
          <li
            key={`${q.criterion.id}-${q.type}`}
            className={`summary-row ${q.firstTryCorrect ? "correct" : "missed"}`}
          >
            <span className="summary-mark" aria-hidden="true">
              {q.firstTryCorrect ? "✓" : "✕"}
            </span>
            <span className="visually-hidden">
              {q.firstTryCorrect ? "Correct:" : "Missed:"}
            </span>
            <span className="summary-crit">
              {q.criterion.id} {q.criterion.title}
            </span>
            {!q.firstTryCorrect ? (
              <span className="summary-answer">Answer: {q.answer}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="start-row">
        {score < round.length ? (
          <button
            className="start-button start-button-primary"
            onClick={onPracticeMisses}
          >
            Practice my misses ({round.length - score})
          </button>
        ) : null}
        <button
          className={`start-button ${score === round.length ? "start-button-primary" : ""}`}
          onClick={onNewRound}
        >
          New round
        </button>
        <button className="start-button" onClick={onReviewGuide}>
          Review the guide
        </button>
      </div>
    </section>
  );
}
