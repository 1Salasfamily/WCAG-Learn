"use client";

import { POUR } from "./wcag";
import type { Criterion, Principle } from "./wcag";
import TagFilterChip from "./TagFilterChip";

type SidebarProps = {
  isOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  isSearching: boolean;
  matchCount: number;
  totalCount: number;
  visibleGrouped: Record<Principle, Criterion[]>;
  expanded: Record<Principle, boolean>;
  onToggleSection: (principle: Principle) => void;
  currentId: string | undefined;
  onJump: (id: string) => void;
  tagFilter: string | null;
  onClearTagFilter: () => void;
  modeSection?: React.ReactNode;
};

export default function Sidebar({
  isOpen,
  query,
  onQueryChange,
  isSearching,
  matchCount,
  totalCount,
  visibleGrouped,
  expanded,
  onToggleSection,
  currentId,
  onJump,
  tagFilter,
  onClearTagFilter,
  modeSection
}: SidebarProps) {
  return (
    <nav
      id="pour-sidebar"
      className={`learn-sidebar ${isOpen ? "open" : ""}`}
      aria-label="POUR criteria navigation"
    >
      <h3 className="sidebar-title">POUR Navigation</h3>

      {modeSection}

      {tagFilter ? (
        <TagFilterChip
          tag={tagFilter}
          count={totalCount}
          onClear={onClearTagFilter}
          compact
          className="sidebar-filter-chip"
        />
      ) : null}

      <div className="sidebar-search">
        <label className="visually-hidden" htmlFor="criteria-search">
          Search success criteria
        </label>
        <input
          id="criteria-search"
          className="sidebar-search-input"
          type="search"
          placeholder="Search criteria…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <p className="sidebar-search-count" aria-live="polite">
          {isSearching ? `${matchCount} of ${totalCount} criteria match` : ""}
        </p>
      </div>

      {isSearching && matchCount === 0 ? (
        <p className="sidebar-empty">
          No matches. Try a criterion number like 1.4.3, or a keyword like
          &ldquo;contrast&rdquo; or &ldquo;keyboard&rdquo;.
        </p>
      ) : null}

      {POUR.map((principle) => {
        // Searching and tag filtering both narrow the list: hide principles
        // with no matches and present the ones that have them expanded.
        const narrowed = isSearching || tagFilter !== null;
        const open = narrowed ? true : expanded[principle];
        if (narrowed && visibleGrouped[principle].length === 0) {
          return null;
        }
        return (
          <section className="sidebar-group" key={principle}>
            <button
              className="group-toggle"
              onClick={() => onToggleSection(principle)}
              aria-expanded={open}
              aria-controls={`group-${principle}`}
            >
              <span className={`group-arrow ${open ? "open" : ""}`}>▶</span>
              <span>{principle}</span>
            </button>

            <div
              id={`group-${principle}`}
              className={`criteria-wrap ${open ? "" : "hidden"}`}
            >
              {visibleGrouped[principle].map((item) => {
                const active = currentId === item.id;
                return (
                  <button
                    key={item.id}
                    className={`criteria-row ${active ? "active" : ""}`}
                    onClick={() => onJump(item.id)}
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
  );
}
