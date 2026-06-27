"use client";

import { POUR } from "./wcag";
import type {
  LevelFilter,
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
  onPracticeMisses: () => void;
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
  onPracticeMisses,
  onNewRound,
  onReviewGuide
}: QuizProps) {
  return (
    <>
      <div className="quiz-filter-row">
        <div
          className="quiz-filter-group"
          role="group"
          aria-label="Filter questions by principle"
        >
          {(["All", ...POUR] as PrincipleFilter[]).map((p) => (
            <button
              key={p}
              className={`quiz-filter-chip ${principleFilter === p ? "active" : ""}`}
              aria-pressed={principleFilter === p}
              onClick={() => onPrincipleFilter(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div
          className="quiz-filter-group"
          role="group"
          aria-label="Filter questions by conformance level"
        >
          {(["All", "A", "AA"] as LevelFilter[]).map((l) => (
            <button
              key={l}
              className={`quiz-filter-chip ${levelFilter === l ? "active" : ""}`}
              aria-pressed={levelFilter === l}
              onClick={() => onLevelFilter(l)}
            >
              {l === "All" ? "All levels" : `Level ${l}`}
            </button>
          ))}
        </div>
      </div>

      {phase === "summary" ? (
        <QuizSummary
          round={round}
          score={score}
          onPracticeMisses={onPracticeMisses}
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
