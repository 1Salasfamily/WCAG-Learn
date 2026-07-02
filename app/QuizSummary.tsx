"use client";

import type { Principle, QuizQuestion } from "./wcag";

type QuizSummaryProps = {
  round: QuizQuestion[];
  score: number;
  mastered: number;
  masteryTotal: number;
  perPrinciple: Array<{ principle: Principle; mastered: number; total: number }>;
  weakestCount: number;
  onPracticeWeakest: () => void;
  onNewRound: () => void;
  onReviewGuide: () => void;
};

export default function QuizSummary({
  round,
  score,
  mastered,
  masteryTotal,
  perPrinciple,
  weakestCount,
  onPracticeWeakest,
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
      <div className="mastery-block">
        <p className="mastery-line">
          Overall mastery{" "}
          <span className="mastery-num">
            {mastered} / {masteryTotal}
          </span>
        </p>
        <div className="mastery-bar" aria-hidden="true">
          <div
            className="mastery-fill"
            style={{ width: `${(mastered / masteryTotal) * 100}%` }}
          />
        </div>
        <ul className="mastery-rows" aria-label="Mastery by principle">
          {perPrinciple.map((row) => (
            <li className="mastery-row" key={row.principle}>
              <span className="mastery-row-label">{row.principle}</span>
              <span className="mastery-row-bar" aria-hidden="true">
                <span
                  className="mastery-fill"
                  style={{ width: `${(row.mastered / row.total) * 100}%` }}
                />
              </span>
              <span className="mastery-row-num">
                {row.mastered}/{row.total}
              </span>
            </li>
          ))}
        </ul>
      </div>
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
        {weakestCount > 0 ? (
          <button
            className="start-button start-button-primary"
            onClick={onPracticeWeakest}
          >
            Practice weakest ({weakestCount})
          </button>
        ) : null}
        <button
          className={`start-button ${weakestCount === 0 ? "start-button-primary" : ""}`}
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
