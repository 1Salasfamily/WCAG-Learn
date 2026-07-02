"use client";

import { useRef, useState } from "react";
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

const BROWSE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];

type FilterSelectProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onCommit: (value: T) => void;
};

// Native select that defers keyboard-browsed changes until the user commits
// them (Enter, or leaving the control). On Windows/Linux a closed select
// fires `change` on every arrow keypress; committing those immediately would
// deal a new quiz round while the user is still browsing the options. Mouse
// and touch picks commit instantly, as before.
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onCommit
}: FilterSelectProps<T>) {
  const [pending, setPending] = useState<T | null>(null);
  const keyboardBrowsing = useRef(false);

  function commit(next: T) {
    setPending(null);
    keyboardBrowsing.current = false;
    if (next !== value) onCommit(next);
  }

  return (
    <label className="quiz-filter">
      <span className="quiz-filter-label">{label}</span>
      <span className="quiz-select-shell">
        <select
          className="quiz-filter-select"
          value={pending ?? value}
          onKeyDown={(event) => {
            if (BROWSE_KEYS.includes(event.key)) {
              keyboardBrowsing.current = true;
            }
          }}
          onKeyUp={(event) => {
            // keyup, not keydown: when a dropdown selection is confirmed with
            // Enter, the change event lands between the two.
            if (event.key === "Enter" && pending !== null) {
              commit(pending);
            }
          }}
          onChange={(event) => {
            const next = event.target.value as T;
            if (keyboardBrowsing.current) {
              setPending(next);
            } else {
              commit(next);
            }
          }}
          onBlur={() => {
            if (pending !== null) {
              commit(pending);
            } else {
              keyboardBrowsing.current = false;
            }
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

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
        <FilterSelect<PrincipleFilter>
          label="Principle"
          value={principleFilter}
          onCommit={onPrincipleFilter}
          options={[
            { value: "All", label: "All principles" },
            ...POUR.map((p) => ({ value: p as PrincipleFilter, label: p }))
          ]}
        />
        <FilterSelect<LevelFilter>
          label="Level"
          value={levelFilter}
          onCommit={onLevelFilter}
          options={[
            { value: "All", label: "All levels" },
            { value: "A", label: "Level A" },
            { value: "AA", label: "Level AA" }
          ]}
        />
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
