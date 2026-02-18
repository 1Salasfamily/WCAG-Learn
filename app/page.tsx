"use client";

import { useEffect, useMemo, useState } from "react";
import wcagData from "@/data/wcag.json";

type Principle = "Perceivable" | "Operable" | "Understandable" | "Robust";

type Criterion = {
  id: string;
  title: string;
  level: "A" | "AA";
  principle: Principle;
  shortExplanation: string;
};

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
  const [flipped, setFlipped] = useState(false);
  const [expanded, setExpanded] = useState<Record<Principle, boolean>>({
    Perceivable: true,
    Operable: true,
    Understandable: true,
    Robust: true
  });

  const current = cards[activeIndex];

  const statusText = started
    ? `Viewing ${activeIndex + 1} of ${cards.length}: ${current.id} ${current.title}`
    : "Ready. Choose Start in Order or Start Random Order.";

  function resetToStart() {
    setCards(ordered);
    setActiveIndex(0);
    setFlipped(false);
    setStarted(false);
  }

  function startOrder() {
    setCards(ordered);
    setActiveIndex(0);
    setFlipped(false);
    setStarted(true);
  }

  function startRandom() {
    setCards(shuffle(ordered));
    setActiveIndex(0);
    setFlipped(false);
    setStarted(true);
  }

  function goBack() {
    if (!started) return;
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setFlipped(false);
  }

  function goNext() {
    if (!started) return;
    setActiveIndex((prev) => (prev + 1) % cards.length);
    setFlipped(false);
  }

  function jumpToCriterion(id: string) {
    if (!started) {
      setCards(ordered);
      setStarted(true);
    }

    const idx = (started ? cards : ordered).findIndex((item) => item.id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      setFlipped(false);
    }
  }

  function toggleSection(principle: Principle) {
    setExpanded((prev) => ({ ...prev, [principle]: !prev[principle] }));
  }

  useEffect(() => {
    function onReset() {
      resetToStart();
    }

    window.addEventListener("wcag-learn:reset", onReset);
    return () => window.removeEventListener("wcag-learn:reset", onReset);
  }, [ordered]);

  return (
    <section className="learn-layout" aria-labelledby="learn-heading">
      <h2 id="learn-heading" className="visually-hidden">
        WCAG Learn Study App
      </h2>

      <aside className="learn-sidebar" aria-label="POUR criteria navigation">
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

      <div className="learn-main">
        <p className="status-text" aria-live="polite">
          {statusText}
        </p>

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
          <section
            className={`study-shell ${flipped ? "is-flipped" : ""}`}
            aria-label="Flashcard study interface"
          >
            <div className="arrow-block left">
              <button className="arrow-button" onClick={goBack} aria-label="Back">
                ◀
              </button>
              <span className="arrow-label">Back</span>
            </div>

            <div className="card-stack">
              <p className="principle-label">{current.principle.toUpperCase()}</p>

              <button
                className="card-trigger"
                onClick={() => setFlipped((prev) => !prev)}
                aria-label="Flip flashcard"
              >
                <article className="flashcard" aria-live="polite">
                  {!flipped ? (
                    <div className="card-front">
                      <p className="sc-number">{current.id}</p>
                      <h3 className="sc-title">{current.title}</h3>
                      <p className="sc-description">{current.shortExplanation}</p>
                    </div>
                  ) : (
                    <div className="card-back">
                      <div
                        className="example-image"
                        role="img"
                        aria-label={`Example visual placeholder for ${current.id} ${current.title}`}
                      >
                        Example image area
                      </div>
                      <p className="sc-description">
                        Highlighted example region for criterion review.
                      </p>
                    </div>
                  )}
                </article>
              </button>
            </div>

            <aside className={`caption-card ${flipped ? "" : "hidden"}`} aria-live="polite">
              <h4>{current.id}</h4>
              <p>{current.title}</p>
              <p>{current.shortExplanation}</p>
            </aside>

            <div className="arrow-block right">
              <button className="arrow-button" onClick={goNext} aria-label="Next">
                ▶
              </button>
              <span className="arrow-label">Next</span>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
