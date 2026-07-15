"use client";

type TagFilterChipProps = {
  tag: string;
  count: number;
  onClear: () => void;
  // The sidebar is narrow, so its chip drops the word "criteria".
  compact?: boolean;
  className?: string;
};

// The single source for the active-filter chip: same accessible name and
// clear affordance wherever it appears (above the card and in the sidebar).
export default function TagFilterChip({
  tag,
  count,
  onClear,
  compact = false,
  className = ""
}: TagFilterChipProps) {
  return (
    <button
      className={`tag-filter-chip ${className}`.trim()}
      onClick={onClear}
      aria-label={`Showing ${count} criteria tagged ${tag}. Clear filter to show all criteria.`}
    >
      {tag} · {count}
      {compact ? "" : " criteria"}
      <span className="tag-filter-clear" aria-hidden="true">
        ✕ Show all
      </span>
    </button>
  );
}
