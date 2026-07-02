"use client";

import { POUR } from "./wcag";
import type {
  LevelFilter,
  Principle,
  PrincipleFilter,
  QuizPhase,
  QuizQuestion,
  QuizState
} from "./wcag";
import QuizSummary from "./QuizSummary";

type QuizProps = {
  principleFilter: PrincipleFilter;
  onPrincipleFilter: (value: PrincipleFilter) => void;
  levelFilter: LevelFilter;
  onLevelFilter: (value: LevelFilter) => void;
  phase: QuizPhase;
  question: QuizQuestion | undefined;
  index: number;
  round: QuizQuestion[];
  score: number;
  state: QuizState;
  selectedOption: string | null;
  onPick: (option: string) => void;
  onNext: () => void;
  mastered: number;
  masteryTotal: number;
  perPrinciple: Array<{ principle: Principle; mastered: number; total: number }>;
  weakestCount: number;
  onPracticeWeakest: () => void;
  onNewRound: () => void;
  onReviewGuide: () => void;
};

export default function Quiz({
  principleFilter,
  onPrincipleFilter,
  levelFilter,
  onLevelFilter,
  phase,
  question,
  index,
  round,
  score,
  state,
  selectedOption,
  onPick,
  onNext,
  mastered,
  masteryTotal,
  perPrinciple,
  weakestCount,
  onPracticeWeakest,
  onNewRound,
  onReviewGuide
}: QuizProps) {
  return (
    <>
      <div className="quiz-filter-row">
        <label className="quiz-filter">
          <span className="quiz-filter-label">Principle</span>
          <span className="quiz-select-shell">
            <select
              className="quiz-filter-select"
              value={principleFilter}
              onChange={(event) =>
                onPrincipleFilter(event.target.value as PrincipleFilter)
              }
            >
              <option value="All">All principles</option>
              {POUR.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="quiz-filter">
          <span className="quiz-filter-label">Level</span>
          <span className="quiz-select-shell">
            <select
              className="quiz-filter-select"
              value={levelFilter}
              onChange={(event) =>
                onLevelFilter(event.target.value as LevelFilter)
              }
            >
              <option value="All">All levels</option>
              <option value="A">Level A</option>
              <option value="AA">Level AA</option>
            </select>
          </span>
        </label>
      </div>

      {phase === "summary" ? (
        <QuizSummary
          round={round}
          score={score}
          mastered={mastered}
          masteryTotal={masteryTotal}
          perPrinciple={perPrinciple}
          weakestCount={weakestCount}
          onPracticeWeakest={onPracticeWeakest}
          onNewRound={onNewRound}
          onReviewGuide={onReviewGuide}
        />
      ) : question ? (
        <>
          <article className="flashcard quiz-card" aria-live="polite">
            <div className="card-front">
              <p className="sc-quiz-kicker">{question.kicker}</p>
              <p
                className={
                  question.type === "idToTitle"
                    ? "sc-quiz-id"
                    : question.type === "descToTitle" ||
                        question.type === "scenario"
                      ? "sc-quiz-quote"
                      : "sc-quiz-text"
                }
              >
                {question.cardText}
              </p>
            </div>
          </article>
          <div className="quiz-wrap" aria-live="polite">
            <div className="quiz-progress-row">
              <p className="quiz-progress">
                Question {index + 1} of {round.length}
              </p>
              <span className="quiz-score-chip">Score: {score}</span>
            </div>
            <p className="quiz-prompt">{question.prompt}</p>
            <div
              className="quiz-options"
              role="group"
              aria-label="Quiz answer choices"
            >
              {question.options.map((option, optionIndex) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === question.answer;
                const stateClass =
                  state === "correct" && isCorrect
                    ? "correct"
                    : state === "wrong" && isSelected
                      ? "wrong"
                      : "";

                return (
                  <button
                    key={`${question.criterion.id}-${option}`}
                    className={`quiz-option ${stateClass}`}
                    onClick={() => onPick(option)}
                    disabled={state === "correct" && !isCorrect}
                  >
                    <kbd className="quiz-key" aria-hidden="true">
                      {optionIndex + 1}
                    </kbd>
                    <span className="quiz-option-text">{option}</span>
                  </button>
                );
              })}
            </div>
            {state === "correct" ? (
              <>
                <p className="quiz-correct-burst">Correct!</p>
                <div className="quiz-next-row">
                  <button
                    className="start-button start-button-primary"
                    onClick={onNext}
                  >
                    {index + 1 >= round.length ? "See results" : "Next question"}
                  </button>
                </div>
              </>
            ) : (
              <p className={`quiz-message ${state === "wrong" ? "wrong" : ""}`}>
                {state === "wrong"
                  ? "Not quite — try again."
                  : "Choose one option."}
              </p>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
