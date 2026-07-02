"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import wcagData from "@/data/wcag.json";
import {
  buildQuizQuestion,
  buildQuizQuestionOfType,
  buildQuizRound,
  compareCriteria,
  criterionMatches,
  MASTERY_STREAK,
  normalizeSearchQuery,
  OBSOLETE_IDS,
  POUR,
  QUIZ_ROUND_LENGTH,
  shuffle
} from "./wcag";
import type {
  Criterion,
  LevelFilter,
  MasteryMap,
  Principle,
  PrincipleFilter,
  QuizPhase,
  QuizQuestion,
  QuizQuestionType,
  QuizState,
  ViewMode
} from "./wcag";
import Sidebar from "./Sidebar";
import ReferenceCard from "./ReferenceCard";
import Quiz from "./Quiz";
import ImageOverlay from "./ImageOverlay";

// Saved-session shape for auto-resume. Questions persist as (criterion id,
// type, first-try result) and are rebuilt on restore — options may reshuffle,
// but the subject, progress, and score are preserved.
const SESSION_KEY = "wcag-learn:session:v1";
const MASTERY_KEY = "wcag-learn:mastery:v1";

type SavedSession = {
  started: boolean;
  activeIndex: number;
  quiz?: {
    round: Array<{
      id: string;
      type: QuizQuestionType;
      ftc: boolean | null;
    }>;
    index: number;
    phase: QuizPhase;
    principleFilter: PrincipleFilter;
    levelFilter: LevelFilter;
  };
};

export default function HomePage() {
  const ordered = useMemo(
    () => [...(wcagData as Criterion[])].sort(compareCriteria),
    []
  );

  const grouped = useMemo(() => {
    const map: Record<Principle, Criterion[]> = {
      Perceivable: [],
      Operable: [],
      Understandable: [],
      Robust: []
    };

    ordered.forEach((item) => {
      map[item.principle].push(item);
    });

    return map;
  }, [ordered]);

  const [started, setStarted] = useState(false);
  const [cards, setCards] = useState<Criterion[]>(ordered);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("reference");
  const [exampleExpanded, setExampleExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quizRound, setQuizRound] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizPrincipleFilter, setQuizPrincipleFilter] = useState<PrincipleFilter>("All");
  const [quizLevelFilter, setQuizLevelFilter] = useState<LevelFilter>("All");
  const [sidebarQuery, setSidebarQuery] = useState("");

  // Mirrors used by the quiz round-build effect so an in-progress round
  // survives mode round-trips and restored sessions (see that effect below).
  const quizRoundRef = useRef<QuizQuestion[]>([]);
  const roundFiltersRef = useRef<string | null>(null);

  // Cross-session mastery: first-try history per criterion. Survives the
  // logo/Reset exits — it's learning progress, not session state.
  const [mastery, setMastery] = useState<MasteryMap>({});

  const searchQuery = normalizeSearchQuery(sidebarQuery);
  const isSearching = searchQuery.length > 0;

  const visibleGrouped = useMemo(() => {
    if (!isSearching) return grouped;
    const map: Record<Principle, Criterion[]> = {
      Perceivable: [],
      Operable: [],
      Understandable: [],
      Robust: []
    };
    POUR.forEach((principle) => {
      map[principle] = grouped[principle].filter((item) =>
        criterionMatches(item, searchQuery)
      );
    });
    return map;
  }, [grouped, searchQuery, isSearching]);

  const searchMatchCount = POUR.reduce(
    (count, principle) => count + visibleGrouped[principle].length,
    0
  );

  const quizPool = useMemo(
    () =>
      ordered.filter(
        (item) =>
          !OBSOLETE_IDS.has(item.id) &&
          (quizPrincipleFilter === "All" || item.principle === quizPrincipleFilter) &&
          (quizLevelFilter === "All" || item.level === quizLevelFilter)
      ),
    [ordered, quizPrincipleFilter, quizLevelFilter]
  );

  const quizzable = useMemo(
    () => ordered.filter((item) => !OBSOLETE_IDS.has(item.id)),
    [ordered]
  );

  const masteryStats = useMemo(() => {
    const perPrinciple = POUR.map((principle) => {
      const items = quizzable.filter((c) => c.principle === principle);
      const mastered = items.filter(
        (c) => (mastery[c.id]?.streak ?? 0) >= MASTERY_STREAK
      ).length;
      return { principle, mastered, total: items.length };
    });
    // "Weakest" = attempted but the most recent first try was wrong.
    const weakest = quizzable.filter((c) => {
      const entry = mastery[c.id];
      return entry !== undefined && entry.attempts > 0 && entry.streak === 0;
    });
    return {
      mastered: perPrinciple.reduce((sum, row) => sum + row.mastered, 0),
      total: quizzable.length,
      perPrinciple,
      weakest
    };
  }, [quizzable, mastery]);
  const [expanded, setExpanded] = useState<Record<Principle, boolean>>({
    Perceivable: true,
    Operable: true,
    Understandable: true,
    Robust: true
  });

  const current = cards[activeIndex];
  const currentImageSrc = current
    ? `/images/${current.id.split(".").join("-")}.svg`
    : "";
  const detailParagraphs = current?.shortExplanation.split("\n\n") ?? [];
  const detailSections = [
    { heading: "What this means", text: detailParagraphs[0] ?? "" },
    { heading: "Why it matters", text: detailParagraphs[1] ?? "" },
    { heading: "Who it helps", text: detailParagraphs[2] ?? "" }
  ].filter((section) => section.text.trim().length > 0);

  const currentQuestion = quizRound[quizIndex];
  const quizScore = quizRound.filter((q) => q.firstTryCorrect === true).length;

  const statusText = !started
    ? "Ready. Choose Start Reference Guide or Start Quiz."
    : viewMode === "quiz"
      ? quizPhase === "summary"
        ? `Round complete: ${quizScore} of ${quizRound.length} correct.`
        : `Quiz round: question ${quizIndex + 1} of ${quizRound.length}`
      : `Viewing ${activeIndex + 1} of ${cards.length}: ${current.id} ${current.title}`;

  function resetTransientUI() {
    setExampleExpanded(false);
    setQuizState("idle");
    setSelectedOption(null);
  }

  function startNewRound() {
    setQuizRound(buildQuizRound(quizPool, ordered));
    setQuizIndex(0);
    setQuizPhase("question");
    setQuizState("idle");
    setSelectedOption(null);
  }

  // Practice weakest: a round built from every criterion whose most recent
  // first try was wrong — across all sessions, not just this round. This
  // round's misses are already recorded by the time the summary shows, so
  // they're included automatically.
  function startWeakestRound() {
    const pool = masteryStats.weakest;
    if (pool.length === 0) return;
    setQuizRound(
      shuffle(pool)
        .slice(0, QUIZ_ROUND_LENGTH)
        .map((criterion) => buildQuizQuestion(criterion, ordered))
    );
    setQuizIndex(0);
    setQuizPhase("question");
    setQuizState("idle");
    setSelectedOption(null);
  }

  function goToNextQuestion() {
    if (quizIndex + 1 >= quizRound.length) {
      setQuizPhase("summary");
      return;
    }
    setQuizIndex((prev) => prev + 1);
    setQuizState("idle");
    setSelectedOption(null);
  }

  // The two start-screen buttons enter a mode directly. Reference is always in
  // order (the sidebar is ordered by POUR regardless); the quiz round is built
  // fresh and shuffled on every entry by the viewMode effect below.
  function start(mode: ViewMode) {
    setCards(ordered);
    setActiveIndex(0);
    setViewMode(mode);
    resetTransientUI();
    setStarted(true);
    // Starting fresh from the start screen always deals a new quiz round —
    // clear any leftover round so the round-build effect rebuilds.
    setQuizRound([]);
    quizRoundRef.current = [];
    roundFiltersRef.current = null;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wcag-learn:view-mode", mode);
    }
  }

  // Move focus onto the selected criterion's summary card so keyboard and
  // screen-reader users land directly on the chosen content — the same region
  // the "Skip to main content" link and sidebar selection target.
  function focusCriterionCard() {
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>(".reference-topbar") ??
        document.querySelector<HTMLElement>(".learn-main");
      if (!target) return;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus();
      target.scrollIntoView({ block: "start" });
    });
  }

  function goBack() {
    if (!started) return;
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
    resetTransientUI();
    // No focus move here: Next/Back is sequential browsing, so focus stays on
    // the button for repeated activation. The aria-live status announces each
    // card change.
  }

  function goNext() {
    if (!started) return;
    setActiveIndex((prev) => (prev + 1) % cards.length);
    resetTransientUI();
  }

  function jumpToCriterion(id: string) {
    // The sidebar that calls this only renders while started and in
    // reference mode, so `cards` is always the active deck here.
    const idx = cards.findIndex((item) => item.id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      resetTransientUI();
      setIsSidebarOpen(false);
      focusCriterionCard();
    }
  }

  function toggleSection(principle: Principle) {
    setExpanded((prev) => ({ ...prev, [principle]: !prev[principle] }));
  }

  function toggleExampleExpanded() {
    setExampleExpanded((prev) => !prev);
  }

  function closeExampleExpanded() {
    setExampleExpanded(false);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(".reference-image-trigger")
        ?.focus();
    });
  }

  function setMode(mode: ViewMode) {
    setViewMode(mode);
    setExampleExpanded(false);
    setIsSidebarOpen(false);
    setQuizState("idle");
    setSelectedOption(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wcag-learn:view-mode", mode);
    }
  }

  function handleQuizOptionPick(option: string) {
    if (!currentQuestion || quizState === "correct") return;
    setSelectedOption(option);
    const isCorrect = option === currentQuestion.answer;
    setQuizState(isCorrect ? "correct" : "wrong");
    // Long-term mastery records first tries only — retries after a wrong
    // answer don't count toward (or against) the streak.
    if (currentQuestion.firstTryCorrect === null) {
      const id = currentQuestion.criterion.id;
      setMastery((prev) => {
        const entry = prev[id] ?? { attempts: 0, streak: 0 };
        return {
          ...prev,
          [id]: {
            attempts: entry.attempts + 1,
            streak: isCorrect ? entry.streak + 1 : 0
          }
        };
      });
    }
    setQuizRound((prev) =>
      prev.map((q, i) =>
        i === quizIndex && q.firstTryCorrect === null
          ? { ...q, firstTryCorrect: isCorrect }
          : q
      )
    );
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MASTERY_KEY);
      if (raw) setMastery(JSON.parse(raw) as MasteryMap);
    } catch {
      window.localStorage.removeItem(MASTERY_KEY);
    }
  }, []);

  useEffect(() => {
    // Entries are only ever added or updated, so an empty map is always the
    // pre-load initial state — persisting it would clobber saved history
    // (StrictMode runs mount effects twice, interleaving save with load).
    if (typeof window === "undefined" || Object.keys(mastery).length === 0) {
      return;
    }
    window.localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
  }, [mastery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("wcag-learn:view-mode");
    if (stored === "reference" || stored === "quiz") {
      setViewMode(stored);
    }

    // Auto-resume: restore the saved session so a reload, an About-page
    // detour, or a mobile tab eviction doesn't lose the user's place. The
    // logo and Reset remain the intentional ways to leave/restart.
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedSession;
      if (!saved?.started) return;
      setStarted(true);
      setActiveIndex(
        Math.min(Math.max(0, saved.activeIndex ?? 0), ordered.length - 1)
      );
      const quiz = saved.quiz;
      if (!quiz) return;
      if (quiz.principleFilter) setQuizPrincipleFilter(quiz.principleFilter);
      if (quiz.levelFilter) setQuizLevelFilter(quiz.levelFilter);
      const round = (quiz.round ?? [])
        .map((entry) => {
          if (OBSOLETE_IDS.has(entry.id)) return null;
          const criterion = ordered.find((c) => c.id === entry.id);
          if (!criterion) return null;
          const type: QuizQuestionType =
            entry.type === "scenario" && !criterion.example?.fail
              ? "idToTitle"
              : entry.type;
          return {
            ...buildQuizQuestionOfType(criterion, ordered, type),
            firstTryCorrect: entry.ftc
          };
        })
        .filter((q): q is QuizQuestion => q !== null);
      if (round.length === 0) return;
      // Prime the refs so the round-build effect resumes this round instead
      // of dealing a new one.
      quizRoundRef.current = round;
      roundFiltersRef.current = `${quiz.principleFilter}|${quiz.levelFilter}`;
      setQuizRound(round);
      setQuizIndex(Math.min(Math.max(0, quiz.index ?? 0), round.length - 1));
      setQuizPhase(quiz.phase === "summary" ? "summary" : "question");
    } catch {
      // Corrupt/legacy payload — start clean.
      window.localStorage.removeItem(SESSION_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    quizRoundRef.current = quizRound;
  }, [quizRound]);

  useEffect(() => {
    if (!started || viewMode !== "quiz") return;
    const filtersKey = `${quizPrincipleFilter}|${quizLevelFilter}`;
    // Resume an in-progress round (mode round-trips, restored sessions).
    // Only deal a new round when there is none, or the filters changed —
    // peeking at the reference guide mid-round no longer wipes progress.
    if (
      quizRoundRef.current.length > 0 &&
      roundFiltersRef.current === filtersKey
    ) {
      return;
    }
    roundFiltersRef.current = filtersKey;
    setQuizRound(buildQuizRound(quizPool, ordered));
    setQuizIndex(0);
    setQuizPhase("question");
    setQuizState("idle");
    setSelectedOption(null);
  }, [started, ordered, viewMode, quizPool, quizPrincipleFilter, quizLevelFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: SavedSession = {
      started,
      activeIndex,
      quiz: {
        round: quizRound.map((q) => ({
          id: q.criterion.id,
          type: q.type,
          ftc: q.firstTryCorrect
        })),
        index: quizIndex,
        phase: quizPhase,
        principleFilter: quizPrincipleFilter,
        levelFilter: quizLevelFilter
      }
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }, [
    started,
    activeIndex,
    quizRound,
    quizIndex,
    quizPhase,
    quizPrincipleFilter,
    quizLevelFilter
  ]);

  useEffect(() => {
    // Reset only clears the current quiz's progress — a fresh shuffled round
    // within the active filters — rather than returning to the start screen.
    function onReset() {
      startNewRound();
    }

    window.addEventListener("wcag-learn:reset", onReset);
    return () => window.removeEventListener("wcag-learn:reset", onReset);
  }, [quizPool, ordered]);

  useEffect(() => {
    // The site logo returns to the start screen from anywhere in the app.
    function onHome() {
      setCards(ordered);
      setActiveIndex(0);
      setIsSidebarOpen(false);
      resetTransientUI();
      setStarted(false);
    }

    window.addEventListener("wcag-learn:home", onHome);
    return () => window.removeEventListener("wcag-learn:home", onHome);
  }, [ordered]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("wcag-learn:state", { detail: { started, viewMode } })
    );
  }, [started, viewMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExampleExpanded((wasOpen) => {
          if (wasOpen) {
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLButtonElement>(".reference-image-trigger")
                ?.focus();
            });
          }
          return false;
        });
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep the latest shortcut logic in a ref so the keydown listener can be
  // bound once (below) yet always see fresh state, instead of re-subscribing
  // on every render.
  const shortcutHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  shortcutHandlerRef.current = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const isEditable =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);
    if (isEditable || exampleExpanded || !started) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (viewMode === "reference") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      return;
    }

    if (viewMode === "quiz" && quizPhase === "question" && currentQuestion) {
      if (/^[1-4]$/.test(event.key)) {
        const optionIndex = Number(event.key) - 1;
        const option = currentQuestion.options[optionIndex];
        if (option) {
          handleQuizOptionPick(option);
        }
      }
    }
  };

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      shortcutHandlerRef.current(event);
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const showSidebar = started && viewMode === "reference";

  return (
    <section
      className={`learn-layout ${showSidebar ? "" : "no-sidebar"}`}
      aria-labelledby="learn-heading"
    >
      <h2 id="learn-heading" className="visually-hidden">
        WCAG Learn Study App
      </h2>

      {showSidebar ? (
        <Sidebar
          isOpen={isSidebarOpen}
          query={sidebarQuery}
          onQueryChange={setSidebarQuery}
          isSearching={isSearching}
          matchCount={searchMatchCount}
          totalCount={ordered.length}
          visibleGrouped={visibleGrouped}
          expanded={expanded}
          onToggleSection={toggleSection}
          currentId={current?.id}
          onJump={jumpToCriterion}
        />
      ) : null}

      {showSidebar && isSidebarOpen ? <button className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation menu" /> : null}

      <div className="learn-main" tabIndex={-1} aria-label="Main study content">
        <div className="learn-top-row">
          <div className="top-left-group">
            {showSidebar ? (
              <button
                className="sidebar-toggle"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-expanded={isSidebarOpen}
                aria-controls="pour-sidebar"
                aria-label={isSidebarOpen ? "Close POUR navigation menu" : "Open POUR navigation menu"}
              >
                ☰
              </button>
            ) : null}

            <p className="status-text" aria-live="polite">
              {statusText}
              {started && viewMode === "reference" ? (
                <span className="status-principle-chip">{current.principle.toUpperCase()}</span>
              ) : null}
            </p>
          </div>

          {started ? (
          <div className="mode-toggle" role="group" aria-label="Study mode">
            <button
              className={`mode-toggle-button ${viewMode === "reference" ? "active" : ""}`}
              onClick={() => setMode("reference")}
              aria-pressed={viewMode === "reference"}
            >
              Reference Guide
            </button>
            <button
              className={`mode-toggle-button ${viewMode === "quiz" ? "active" : ""}`}
              onClick={() => setMode("quiz")}
              aria-pressed={viewMode === "quiz"}
            >
              Flashcard Quiz
            </button>
          </div>
          ) : null}
        </div>

        <div className="main-stage">
          {!started ? (
            <section className="start-screen" aria-label="Start screen">
              <p className="start-screen-eyebrow">Get started</p>
              <p className="start-screen-title">WCAG Learn</p>
              <p className="start-screen-sub">
                Flashcards and a quick-reference guide for every WCAG 2.2
                success criterion.
              </p>
              <ul className="start-screen-stats" aria-label="What's included">
                <li className="start-screen-stat">{ordered.length} criteria</li>
                <li className="start-screen-stat">Levels A &amp; AA</li>
                <li className="start-screen-stat">POUR principles</li>
              </ul>
              <div className="start-row" role="group" aria-label="Start modes">
                <button className="start-button start-button-primary" onClick={() => start("reference")}>
                  Start Reference Guide
                </button>
                <button className="start-button" onClick={() => start("quiz")}>
                  Start Quiz
                </button>
              </div>
            </section>
          ) : (
            <section className="study-shell" aria-label="Flashcard study interface">
              <div className="card-stack">
                {viewMode === "quiz" ? (
                  <Quiz
                    principleFilter={quizPrincipleFilter}
                    onPrincipleFilter={setQuizPrincipleFilter}
                    levelFilter={quizLevelFilter}
                    onLevelFilter={setQuizLevelFilter}
                    phase={quizPhase}
                    question={currentQuestion}
                    index={quizIndex}
                    round={quizRound}
                    score={quizScore}
                    state={quizState}
                    selectedOption={selectedOption}
                    onPick={handleQuizOptionPick}
                    onNext={goToNextQuestion}
                    mastered={masteryStats.mastered}
                    masteryTotal={masteryStats.total}
                    perPrinciple={masteryStats.perPrinciple}
                    weakestCount={masteryStats.weakest.length}
                    onPracticeWeakest={startWeakestRound}
                    onNewRound={startNewRound}
                    onReviewGuide={() => setMode("reference")}
                  />
                ) : (
                  <ReferenceCard
                    criterion={current}
                    imageSrc={currentImageSrc}
                    sections={detailSections}
                    onExpandImage={toggleExampleExpanded}
                  />
                )}
              </div>

              {viewMode === "reference" ? (
                <div className="study-nav-row">
                  <div className="arrow-block left">
                    <button className="arrow-button" onClick={goBack} aria-label="Back">
                      ◀
                    </button>
                  </div>

                  <div className="arrow-block right">
                    <button className="arrow-button" onClick={goNext} aria-label="Next">
                      ▶
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </div>
      </div>

      {exampleExpanded ? (
        <ImageOverlay
          criterion={current}
          imageSrc={currentImageSrc}
          onClose={closeExampleExpanded}
        />
      ) : null}

    </section>
  );
}
