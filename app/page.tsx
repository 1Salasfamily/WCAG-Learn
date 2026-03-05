"use client";

import Image from "next/image";
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

function buildQuizOptions(current: Criterion, pool: Criterion[]): string[] {
  const distractors = shuffle(pool.filter((item) => item.id !== current.id))
    .slice(0, 2)
    .map((item) => item.title);
  return shuffle([current.title, ...distractors]);
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
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizMessage, setQuizMessage] = useState("");
  const [expanded, setExpanded] = useState<Record<Principle, boolean>>({
    Perceivable: true,
    Operable: true,
    Understandable: true,
    Robust: true
  });

  const current = cards[activeIndex];
  const detailParagraphs = current?.shortExplanation.split("\n\n") ?? [];
  const detailSections = [
    { heading: "What this means", text: detailParagraphs[0] ?? "" },
    { heading: "Why it matters", text: detailParagraphs[1] ?? "" },
    { heading: "Who it helps", text: detailParagraphs[2] ?? "" }
  ].filter((section) => section.text.trim().length > 0);

  const statusText = started
    ? `Viewing ${activeIndex + 1} of ${cards.length}: ${current.id} ${current.title}`
    : "Ready. Choose Start in Order or Start Random Order.";

  function resetTransientUI() {
    setFlipped(false);
    setExampleExpanded(false);
    setQuizState("idle");
    setSelectedOption(null);
    setQuizMessage("");
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
  }

  function setMode(mode: ViewMode) {
    setViewMode(mode);
    setFlipped(false);
    setExampleExpanded(false);
    setQuizState("idle");
    setSelectedOption(null);
    setQuizMessage("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wcag-learn:view-mode", mode);
    }
  }

  function handleQuizOptionPick(option: string) {
    setSelectedOption(option);
    if (option === current.title) {
      setQuizState("correct");
      setQuizMessage("Correct!");
      return;
    }
    setQuizState("wrong");
    setQuizMessage("Try again.");
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("wcag-learn:view-mode");
    if (stored === "reference" || stored === "quiz") {
      setViewMode(stored);
    }
  }, []);

  useEffect(() => {
    if (!current || viewMode !== "quiz") return;
    setQuizOptions(buildQuizOptions(current, ordered));
    setQuizState("idle");
    setSelectedOption(null);
    setQuizMessage("");
  }, [current, ordered, viewMode]);

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
        setExampleExpanded(false);
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section className="learn-layout" aria-labelledby="learn-heading">
      <h2 id="learn-heading" className="visually-hidden">
        WCAG Learn Study App
      </h2>

      <aside
        id="pour-sidebar"
        className={`learn-sidebar ${isSidebarOpen ? "open" : ""}`}
        aria-label="POUR criteria navigation"
      >
        <h3 className="sidebar-title">POUR Navigation</h3>

        {POUR.map((principle) => {
          const open = expanded[principle];
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
                {grouped[principle].map((item) => {
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
      </aside>

      {isSidebarOpen ? <button className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation menu" /> : null}

      <div className="learn-main">
        <div className="learn-top-row">
          <div className="top-left-group">
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-expanded={isSidebarOpen}
              aria-controls="pour-sidebar"
              aria-label={isSidebarOpen ? "Close POUR navigation menu" : "Open POUR navigation menu"}
            >
              ☰
            </button>

            <p className="status-text" aria-live="polite">
              {statusText}
              {started ? <span className="status-principle-chip">{current.principle.toUpperCase()}</span> : null}
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
            <>
            <section className="deck" aria-label="Flashcard deck">
              <p className="deck-title">WCAG Learn</p>
              <p className="deck-sub">Practice WCAG 2.2 Level A + AA</p>
            </section>

            <div className="start-row" role="group" aria-label="Start modes">
              <button className="start-button" onClick={startOrder}>
                Start in Order
              </button>
              <button className="start-button" onClick={startRandom}>
                Start Random Order
              </button>
            </div>
            </>
          ) : (
            <section className="study-shell" aria-label="Flashcard study interface">
              <div className="card-stack">
                {viewMode === "quiz" ? (
                  <button
                    className="card-trigger"
                    aria-label="Quiz prompt card"
                    disabled
                  >
                    <article className="flashcard" aria-live="polite">
                      <div className="card-front">
                        <p className="sc-quiz-id">{current.id}</p>
                      </div>
                    </article>
                  </button>
                ) : (
                  <article className="flashcard" aria-live="polite">
                    <div className="card-back reference-back">
                      <div className="reference-media">
                        <button
                          className="reference-image-trigger"
                          onClick={toggleExampleExpanded}
                          aria-label={`Expand example image for ${current.id} ${current.title}`}
                        >
                          <div className="example-image-frame">
                          <div className="example-image-shell">
                              <Image
                                className="example-image"
                                src="/images/1-1-1-non-text-content.png"
                                alt={`Example visual for ${current.id} ${current.title}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 620px"
                                quality={100}
                              />
                            </div>
                            <span className="reference-expand-hint">Click image to expand</span>
                          </div>
                        </button>
                      </div>
                      <section className="reference-meta-panel" aria-label="Criterion summary details">
                        <div className="reference-header-row">
                          <span className="details-id-badge">{current.id}</span>
                          <p className="reference-title">{current.title}</p>
                        </div>
                        <div className="reference-chip-row" aria-label="Criterion metadata">
                          <span className={`details-level details-level-${current.level.toLowerCase()}`}>
                            Level {current.level}
                          </span>
                          {getAssistiveTech(current).map((tech) => (
                            <span key={`${current.id}-${tech}`} className="details-tech-chip">
                              {tech}
                            </span>
                          ))}
                        </div>
                        <div className="reference-meta-divider" aria-hidden="true" />
                      </section>
                      <div className="reference-sections">
                        {detailSections.map((section) => (
                          <section key={`${current.id}-${section.heading}`} className="reference-section">
                            <h4>{section.heading}</h4>
                            <p>{section.text}</p>
                          </section>
                        ))}
                      </div>
                    </div>
                  </article>
                )}
                {viewMode === "quiz" ? (
                  <div className="quiz-wrap" aria-live="polite">
                    <p className="quiz-prompt">Which success criterion matches {current.id}?</p>
                    <div className="quiz-options" role="group" aria-label="Quiz answer choices">
                      {quizOptions.map((option) => {
                        const isSelected = selectedOption === option;
                        const isCorrect = option === current.title;
                        const stateClass =
                          quizState === "correct" && isCorrect
                            ? "correct"
                            : quizState === "wrong" && isSelected
                              ? "wrong"
                              : "";

                        return (
                          <button
                            key={`${current.id}-${option}`}
                            className={`quiz-option ${stateClass}`}
                            onClick={() => handleQuizOptionPick(option)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {quizState === "correct" ? (
                      <p className="quiz-correct-burst">Correct!</p>
                    ) : (
                      <p className={`quiz-message ${quizState === "wrong" ? "wrong" : ""}`}>
                        {quizMessage || "Choose one option."}
                      </p>
                    )}
                  </div>
                ) : (
                  null
                )}
              </div>

              <div className="study-nav-row">
                <div className="arrow-block left">
                  <button className="arrow-button" onClick={goBack} aria-label="Back">
                    ◀
                  </button>
                  <span className="arrow-label">Back</span>
                </div>

                <div className="arrow-block right">
                  <button className="arrow-button" onClick={goNext} aria-label="Next">
                    ▶
                  </button>
                  <span className="arrow-label">Next</span>
                </div>
              </div>
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
            <Image
              className="example-overlay-image"
              src="/images/1-1-1-non-text-content.png"
              alt={`Expanded example visual for ${current.id} ${current.title}`}
              fill
              sizes="100vw"
              quality={100}
              priority
            />
          </div>
          <button className="start-button overlay-close" onClick={closeExampleExpanded}>
            Close
          </button>
        </div>
      ) : null}

    </section>
  );
}
