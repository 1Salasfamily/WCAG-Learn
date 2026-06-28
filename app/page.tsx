"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import wcagData from "@/data/wcag.json";
import {
  buildQuizQuestion,
  buildQuizRound,
  compareCriteria,
  POUR,
  shuffle
} from "./wcag";
import type {
  Criterion,
  LevelFilter,
  Principle,
  PrincipleFilter,
  QuizPhase,
  QuizQuestion,
  QuizState,
  ViewMode
} from "./wcag";
import Sidebar from "./Sidebar";
import ReferenceCard from "./ReferenceCard";
import Quiz from "./Quiz";
import ImageOverlay from "./ImageOverlay";

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

  const searchQuery = sidebarQuery.trim().toLowerCase();
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
      map[principle] = grouped[principle].filter(
        (item) =>
          item.id.toLowerCase().includes(searchQuery) ||
          item.title.toLowerCase().includes(searchQuery)
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
          (quizPrincipleFilter === "All" || item.principle === quizPrincipleFilter) &&
          (quizLevelFilter === "All" || item.level === quizLevelFilter)
      ),
    [ordered, quizPrincipleFilter, quizLevelFilter]
  );
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
    ? "Ready. Choose Start in Order or Start Random Order."
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

  function startMissRound() {
    const missed = quizRound
      .filter((q) => q.firstTryCorrect !== true)
      .map((q) => q.criterion);
    if (missed.length === 0) return;
    setQuizRound(shuffle(missed).map((criterion) => buildQuizQuestion(criterion, ordered)));
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

  function resetToStart() {
    setCards(ordered);
    setActiveIndex(0);
    resetTransientUI();
    setStarted(false);
  }

  function startOrder() {
    setCards(ordered);
    setActiveIndex(0);
    setViewMode("reference");
    resetTransientUI();
    setStarted(true);
  }

  function startRandom() {
    setCards(shuffle(ordered));
    setActiveIndex(0);
    setViewMode("reference");
    resetTransientUI();
    setStarted(true);
  }

  function goBack() {
    if (!started) return;
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
    resetTransientUI();
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
      // Move focus onto the selected criterion's summary card so keyboard and
      // screen-reader users land directly on the content they chose, not back
      // at the top of the sidebar.
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
    const stored = window.localStorage.getItem("wcag-learn:view-mode");
    if (stored === "reference" || stored === "quiz") {
      setViewMode(stored);
    }
  }, []);

  useEffect(() => {
    if (!started || viewMode !== "quiz") return;
    setQuizRound(buildQuizRound(quizPool, ordered));
    setQuizIndex(0);
    setQuizPhase("question");
    setQuizState("idle");
    setSelectedOption(null);
  }, [started, ordered, viewMode, quizPool]);

  useEffect(() => {
    function onReset() {
      resetToStart();
    }

    window.addEventListener("wcag-learn:reset", onReset);
    return () => window.removeEventListener("wcag-learn:reset", onReset);
  }, [ordered]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("wcag-learn:started", { detail: started })
    );
  }, [started]);

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
        </div>

        <div className="main-stage">
          {!started ? (
            <section className="deck" aria-label="Flashcard deck">
              <p className="deck-eyebrow">Study deck</p>
              <p className="deck-title">WCAG Learn</p>
              <p className="deck-sub">
                Flashcards and a quick-reference guide for every WCAG 2.2
                success criterion.
              </p>
              <ul className="deck-stats" aria-label="Deck contents">
                <li className="deck-stat">{ordered.length} criteria</li>
                <li className="deck-stat">Levels A &amp; AA</li>
                <li className="deck-stat">POUR principles</li>
              </ul>
              <div className="start-row" role="group" aria-label="Start modes">
                <button className="start-button start-button-primary" onClick={startOrder}>
                  Start in Order
                </button>
                <button className="start-button" onClick={startRandom}>
                  Start Random Order
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
                    onPracticeMisses={startMissRound}
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
