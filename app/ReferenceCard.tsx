"use client";

import { getTags, NEW_IN_22 } from "./wcag";
import type { Criterion } from "./wcag";

type ReferenceCardProps = {
  criterion: Criterion;
  imageSrc: string;
  sections: { heading: string; text: string }[];
  onExpandImage: () => void;
  activeTag: string | null;
  onToggleTag: (tag: string) => void;
};

export default function ReferenceCard({
  criterion,
  imageSrc,
  sections,
  onExpandImage,
  activeTag,
  onToggleTag
}: ReferenceCardProps) {
  return (
    <article className="flashcard">
      <div className="card-back reference-back">
        <section className="reference-topbar" aria-label="Criterion summary details">
          <span className="details-id-badge">{criterion.id}</span>
          <p className="reference-title">{criterion.title}</p>
          <span
            className={`details-level details-level-${criterion.level.toLowerCase()}`}
          >
            Level {criterion.level}
          </span>
          {NEW_IN_22.has(criterion.id) ? (
            <span className="details-new-chip">New in 2.2</span>
          ) : null}
          {getTags(criterion).map((tag) => {
            const active = activeTag === tag;
            return (
              <button
                key={`${criterion.id}-${tag}`}
                className={`details-tech-chip ${active ? "active" : ""}`}
                aria-pressed={active}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
                {active ? <span aria-hidden="true"> ✓</span> : null}
              </button>
            );
          })}
        </section>
        <div className="reference-meta-divider" aria-hidden="true" />
        <div className="reference-hero">
          <button
            className="reference-image-trigger"
            onClick={onExpandImage}
            aria-label={`Expand example image for ${criterion.id} ${criterion.title}`}
          >
            <div className="example-image-frame">
              <div className="example-image-shell">
                <img
                  className="example-image"
                  src={imageSrc}
                  alt={`Example visual for ${criterion.id} ${criterion.title}`}
                />
              </div>
              <span className="reference-expand-hint">Select to expand</span>
            </div>
          </button>
        </div>
        <div className="reference-sections">
          {sections.map((section) => (
            <section
              key={`${criterion.id}-${section.heading}`}
              className="reference-section"
            >
              <h3>{section.heading}</h3>
              <p>{section.text}</p>
            </section>
          ))}
        </div>
        {criterion.example ? (
          <div className="reference-examples" aria-label="Pass and fail examples">
            <section className="reference-example example-pass">
              <h3>
                <span aria-hidden="true">✓</span> Pass example
              </h3>
              <p>{criterion.example.pass}</p>
            </section>
            <section className="reference-example example-fail">
              <h3>
                <span aria-hidden="true">✕</span> Fail example
              </h3>
              <p>{criterion.example.fail}</p>
            </section>
          </div>
        ) : null}
      </div>
    </article>
  );
}
