"use client";

import { useEffect, useMemo, useState } from "react";
import wcagData from "@/data/wcag.json";

type Principle = "Perceivable" | "Operable" | "Understandable" | "Robust";

type Criterion = {
  id: string;
  title: string;
  level: "A" | "AA" | "AAA";
  principle: Principle;
  shortExplanation: string;
  assistiveTech?: string[];
  example?: {
    pass: string;
    fail: string;
  };
};
type ViewMode = "reference" | "quiz";
type QuizState = "idle" | "correct" | "wrong";

const POUR: Principle[] = [
  "Perceivable",
  "Operable",
  "Understandable",
  "Robust"
];

function parseId(id: string): number[] {
  return id.split(".").map((n) => Number(n));
}

function compareCriteria(a: Criterion, b: Criterion): number {
  const aa = parseId(a.id);
  const bb = parseId(b.id);
  const max = Math.max(aa.length, bb.length);

  for (let i = 0; i < max; i += 1) {
    const av = aa[i] ?? 0;
    const bv = bb[i] ?? 0;
    if (av !== bv) return av - bv;
  }

  return 0;
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const principleTechMap: Record<Principle, string[]> = {
  Perceivable: ["Screen Reader", "Braille Display", "Captions/Media Support"],
  Operable: ["Keyboard Navigation", "Switch Control", "Voice Control"],
  Understandable: ["Screen Reader", "Cognitive Support Tools", "Input Assistance"],
  Robust: ["Screen Reader", "Assistive Browser Tech", "AT Compatibility"]
};

function getAssistiveTech(item: Criterion): string[] {
  if (item.assistiveTech && item.assistiveTech.length > 0) {
    return item.assistiveTech;
  }
  return principleTechMap[item.principle];
}

const NEW_IN_22 = new Set(["2.4.11", "2.5.7", "2.5.8", "3.2.6", "3.3.7", "3.3.8"]);

type QuizQuestionType =
  | "idToTitle"
  | "titleToId"
  | "descToTitle"
  | "level"
  | "principle"
  | "scenario";

type PrincipleFilter = "All" | Principle;
type LevelFilter = "All" | "A" | "AA";

type QuizPhase = "question" | "summary";

type QuizQuestion = {
  criterion: Criterion;
  type: QuizQuestionType;
  kicker: string;
  cardText: string;
  prompt: string;
  options: string[];
  answer: string;
  firstTryCorrect: boolean | null;
};

const QUIZ_ROUND_LENGTH = 10;

function firstSentence(text: string): string {
  const para = text.split("\n\n")[0] ?? "";
  const idx = para.indexOf(". ");
  const sentence = idx >= 0 ? para.slice(0, idx + 1) : para;
  if (sentence.length <= 180) return sentence;
  return `${sentence.slice(0, 177).replace(/\s+\S*$/, "")}…`;
}

function pickDistractors(pool: string[], answer: string, count: number): string[] {
  return shuffle(pool.filter((item) => item !== answer)).slice(0, count);
}

function buildQuizQuestion(criterion: Criterion, all: Criterion[]): QuizQuestion {
  const types: QuizQuestionType[] = [
    "idToTitle",
    "titleToId",
    "descToTitle",
    "level",
    "principle"
  ];
  if (criterion.example?.fail) {
    types.push("scenario");
  }
  const type = types[Math.floor(Math.random() * types.length)];
  const titles = all.map((c) => c.title);
  const ids = all.map((c) => c.id);
  const base = { criterion, type, firstTryCorrect: null };

  switch (type) {
    case "idToTitle":
      return {
        ...base,
        kicker: "Success criterion",
        cardText: criterion.id,
        prompt: `Which success criterion is ${criterion.id}?`,
        options: shuffle([
          criterion.title,
          ...pickDistractors(titles, criterion.title, 2)
        ]),
        answer: criterion.title
      };
    case "titleToId":
      return {
        ...base,
        kicker: "Name the number",
        cardText: criterion.title,
        prompt: `Which number is “${criterion.title}”?`,
        options: shuffle([
          criterion.id,
          ...pickDistractors(ids, criterion.id, 2)
        ]),
        answer: criterion.id
      };
    case "descToTitle":
      return {
        ...base,
        kicker: "Match the description",
        cardText: `“${firstSentence(criterion.shortExplanation)}”`,
        prompt: "Which success criterion does this describe?",
        options: shuffle([
          criterion.title,
          ...pickDistractors(titles, criterion.title, 2)
        ]),
        answer: criterion.title
      };
    case "level":
      return {
        ...base,
        kicker: "Conformance level",
        cardText: `${criterion.id} ${criterion.title}`,
        prompt: "What conformance level is this criterion?",
        options: ["Level A", "Level AA", "Level AAA"],
        answer: `Level ${criterion.level}`
      };
    case "scenario":
      return {
        ...base,
        kicker: "Spot the violation",
        cardText: `“${criterion.example?.fail ?? ""}”`,
        prompt: "Which success criterion does this scenario violate?",
        options: shuffle([
          criterion.title,
          ...pickDistractors(titles, criterion.title, 2)
        ]),
        answer: criterion.title
      };
    default:
      return {
        ...base,
        kicker: "POUR principle",
        cardText: `${criterion.id} ${criterion.title}`,
        prompt: "Which POUR principle does this criterion belong to?",
        options: [...POUR],
        answer: criterion.principle
      };
  }
}

function buildQuizRound(pool: Criterion[], all: Criterion[]): QuizQuestion[] {
  return shuffle(pool)
    .slice(0, QUIZ_ROUND_LENGTH)
    .map((criterion) => buildQuizQuestion(criterion, all));
}

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
  const [flipped, setFlipped] = useState(false);
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
    setFlipped(false);
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
    resetTransientUI();
    setStarted(true);
  }

  function startRandom() {
    setCards(shuffle(ordered));
    setActiveIndex(0);
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
    if (viewMode === "quiz") {
      setMode("reference");
    }
    if (!started) {
      setCards(ordered);
      setStarted(true);
    }

    const idx = (started ? cards : ordered).findIndex((item) => item.id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      resetTransientUI();
      setIsSidebarOpen(false);
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
    setFlipped(false);
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

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
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
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  });

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
      <nav
        id="pour-sidebar"
        className={`learn-sidebar ${isSidebarOpen ? "open" : ""}`}
        aria-label="POUR criteria navigation"
      >
        <h3 className="sidebar-title">POUR Navigation</h3>

        <div className="sidebar-search">
          <label className="visually-hidden" htmlFor="criteria-search">
            Search success criteria
          </label>
          <input
            id="criteria-search"
            className="sidebar-search-input"
            type="search"
            placeholder="Search criteria…"
            value={sidebarQuery}
            onChange={(event) => setSidebarQuery(event.target.value)}
          />
          <p className="sidebar-search-count" aria-live="polite">
            {isSearching
              ? `${searchMatchCount} of ${ordered.length} criteria match`
              : ""}
          </p>
        </div>

        {POUR.map((principle) => {
          const open = isSearching ? true : expanded[principle];
          if (isSearching && visibleGrouped[principle].length === 0) {
            return null;
          }
          return (
            <section className="sidebar-group" key={principle}>
              <button
                className="group-toggle"
                onClick={() => toggleSection(principle)}
                aria-expanded={open}
                aria-controls={`group-${principle}`}
              >
                <span className={`group-arrow ${open ? "open" : ""}`}>
                  ▶
                </span>
                <span>{principle}</span>
              </button>

              <div id={`group-${principle}`} className={`criteria-wrap ${open ? "" : "hidden"}`}>
                {visibleGrouped[principle].map((item) => {
                  const active = started && current?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`criteria-row ${active ? "active" : ""}`}
                      onClick={() => jumpToCriterion(item.id)}
                    >
                      <span className="criteria-id">{item.id}</span>
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>
      ) : null}

      {showSidebar && isSidebarOpen ? <button className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation menu" /> : null}

      <div className="learn-main">
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
                  <div className="quiz-filter-row">
                    <div className="quiz-filter-group" role="group" aria-label="Filter questions by principle">
                      {(["All", ...POUR] as PrincipleFilter[]).map((p) => (
                        <button
                          key={p}
                          className={`quiz-filter-chip ${quizPrincipleFilter === p ? "active" : ""}`}
                          aria-pressed={quizPrincipleFilter === p}
                          onClick={() => setQuizPrincipleFilter(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="quiz-filter-group" role="group" aria-label="Filter questions by conformance level">
                      {(["All", "A", "AA"] as LevelFilter[]).map((l) => (
                        <button
                          key={l}
                          className={`quiz-filter-chip ${quizLevelFilter === l ? "active" : ""}`}
                          aria-pressed={quizLevelFilter === l}
                          onClick={() => setQuizLevelFilter(l)}
                        >
                          {l === "All" ? "All levels" : `Level ${l}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {viewMode === "quiz" ? (
                  quizPhase === "summary" || !currentQuestion ? null : (
                    <article className="flashcard quiz-card" aria-live="polite">
                      <div className="card-front">
                        <p className="sc-quiz-kicker">{currentQuestion.kicker}</p>
                        <p
                          className={
                            currentQuestion.type === "idToTitle"
                              ? "sc-quiz-id"
                              : currentQuestion.type === "descToTitle" ||
                                  currentQuestion.type === "scenario"
                                ? "sc-quiz-quote"
                                : "sc-quiz-text"
                          }
                        >
                          {currentQuestion.cardText}
                        </p>
                      </div>
                    </article>
                  )
                ) : (
                  <article className="flashcard" aria-live="polite">
                    <div className="card-back reference-back">
                      <section className="reference-topbar" aria-label="Criterion summary details">
                        <span className="details-id-badge">{current.id}</span>
                        <p className="reference-title">{current.title}</p>
                        <span className={`details-level details-level-${current.level.toLowerCase()}`}>
                          Level {current.level}
                        </span>
                        {NEW_IN_22.has(current.id) ? (
                          <span className="details-new-chip">New in 2.2</span>
                        ) : null}
                        {getAssistiveTech(current).map((tech) => (
                          <span key={`${current.id}-${tech}`} className="details-tech-chip">
                            {tech}
                          </span>
                        ))}
                      </section>
                      <div className="reference-meta-divider" aria-hidden="true" />
                      <div className="reference-hero">
                        <button
                          className="reference-image-trigger"
                          onClick={toggleExampleExpanded}
                          aria-label={`Expand example image for ${current.id} ${current.title}`}
                        >
                          <div className="example-image-frame">
                            <div className="example-image-shell">
                              <img
                                className="example-image"
                                src={currentImageSrc}
                                alt={`Example visual for ${current.id} ${current.title}`}
                              />
                            </div>
                            <span className="reference-expand-hint">Click image to expand</span>
                          </div>
                        </button>
                      </div>
                      <div className="reference-sections">
                        {detailSections.map((section) => (
                          <section key={`${current.id}-${section.heading}`} className="reference-section">
                            <h3>{section.heading}</h3>
                            <p>{section.text}</p>
                          </section>
                        ))}
                      </div>
                      {current.example ? (
                        <div className="reference-examples" aria-label="Pass and fail examples">
                          <section className="reference-example example-pass">
                            <h3>
                              <span aria-hidden="true">✓</span> Pass example
                            </h3>
                            <p>{current.example.pass}</p>
                          </section>
                          <section className="reference-example example-fail">
                            <h3>
                              <span aria-hidden="true">✕</span> Fail example
                            </h3>
                            <p>{current.example.fail}</p>
                          </section>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )}
                {viewMode === "quiz" ? (
                  quizPhase === "summary" ? (
                    <section
                      className="quiz-summary"
                      aria-live="polite"
                      aria-label="Quiz round results"
                    >
                      <p className="quiz-summary-kicker">Round complete</p>
                      <p className="quiz-summary-score">
                        {quizScore} / {quizRound.length}
                      </p>
                      <p className="quiz-summary-message">
                        {quizScore === quizRound.length
                          ? "Perfect round!"
                          : quizScore >= 8
                            ? "Excellent — almost flawless."
                            : quizScore >= 6
                              ? "Solid work. Review the misses below."
                              : quizScore >= 4
                                ? "Getting there — keep practicing."
                                : "Tough round. The reference guide is one click away."}
                      </p>
                      <ul
                        className="quiz-summary-list"
                        tabIndex={0}
                        aria-label="Question-by-question results"
                      >
                        {quizRound.map((q) => (
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
                        {quizScore < quizRound.length ? (
                          <button
                            className="start-button start-button-primary"
                            onClick={startMissRound}
                          >
                            Practice my misses ({quizRound.length - quizScore})
                          </button>
                        ) : null}
                        <button
                          className={`start-button ${quizScore === quizRound.length ? "start-button-primary" : ""}`}
                          onClick={startNewRound}
                        >
                          New round
                        </button>
                        <button
                          className="start-button"
                          onClick={() => setMode("reference")}
                        >
                          Review the guide
                        </button>
                      </div>
                    </section>
                  ) : currentQuestion ? (
                    <div className="quiz-wrap" aria-live="polite">
                      <div className="quiz-progress-row">
                        <p className="quiz-progress">
                          Question {quizIndex + 1} of {quizRound.length}
                        </p>
                        <span className="quiz-score-chip">Score: {quizScore}</span>
                      </div>
                      <p className="quiz-prompt">{currentQuestion.prompt}</p>
                      <div className="quiz-options" role="group" aria-label="Quiz answer choices">
                        {currentQuestion.options.map((option, optionIndex) => {
                          const isSelected = selectedOption === option;
                          const isCorrect = option === currentQuestion.answer;
                          const stateClass =
                            quizState === "correct" && isCorrect
                              ? "correct"
                              : quizState === "wrong" && isSelected
                                ? "wrong"
                                : "";

                          return (
                            <button
                              key={`${currentQuestion.criterion.id}-${option}`}
                              className={`quiz-option ${stateClass}`}
                              onClick={() => handleQuizOptionPick(option)}
                              disabled={quizState === "correct" && !isCorrect}
                            >
                              <kbd className="quiz-key" aria-hidden="true">
                                {optionIndex + 1}
                              </kbd>
                              <span className="quiz-option-text">{option}</span>
                            </button>
                          );
                        })}
                      </div>
                      {quizState === "correct" ? (
                        <>
                          <p className="quiz-correct-burst">Correct!</p>
                          <div className="quiz-next-row">
                            <button
                              className="start-button start-button-primary"
                              onClick={goToNextQuestion}
                            >
                              {quizIndex + 1 >= quizRound.length
                                ? "See results"
                                : "Next question"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className={`quiz-message ${quizState === "wrong" ? "wrong" : ""}`}>
                          {quizState === "wrong"
                            ? "Not quite — try again."
                            : "Choose one option."}
                        </p>
                      )}
                    </div>
                  ) : null
                ) : (
                  null
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
        <div
          className="example-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded example for ${current.id} ${current.title}`}
          onClick={closeExampleExpanded}
        >
          <div className="example-overlay-image-wrap" onClick={(event) => event.stopPropagation()}>
            <img
              className="example-overlay-image"
              src={currentImageSrc}
              alt={`Expanded example visual for ${current.id} ${current.title}`}
            />
          </div>
          <button
            className="start-button overlay-close"
            onClick={closeExampleExpanded}
            autoFocus
          >
            Close
          </button>
        </div>
      ) : null}

    </section>
  );
}
