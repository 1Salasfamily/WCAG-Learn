// Criterion deep links live in a query parameter rather than the hash: the
// skip link works by native fragment navigation (#study-status,
// #quiz-question), so criterion state in the hash would fight it. A query
// parameter also keeps the site fully static — no route, no new page.
export const CRITERION_PARAM = "c";

export function criterionShareUrl(id: string) {
  // Built from the origin rather than the current href so a fragment left
  // by the skip link, or any unrelated parameter, is never shared along.
  return `${window.location.origin}/?${CRITERION_PARAM}=${encodeURIComponent(id)}`;
}
