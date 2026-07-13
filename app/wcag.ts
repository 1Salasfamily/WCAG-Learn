// Shared types, constants, and pure helpers for the WCAG Learn app.
// Framework-agnostic: no React here, so it can be imported by any component.

export type Principle =
  | "Perceivable"
  | "Operable"
  | "Understandable"
  | "Robust";

export type Criterion = {
  id: string;
  title: string;
  level: "A" | "AA" | "AAA";
  principle: Principle;
  shortExplanation: string;
  // Concept terms people actually type into search ("alt text", "zoom") —
  // curated per criterion in data/wcag.json, next to the content it describes.
  keywords?: string;
  // Who/what the criterion helps ("Screen Reader", "Motor & Touch") — curated
  // per criterion in data/wcag.json from a fixed ~10-term vocabulary. Drives
  // the tappable tag filters in the reference guide.
  tags?: string[];
  example?: {
    pass: string;
    fail: string;
  };
};

export type ViewMode = "reference" | "quiz";
export type QuizState = "idle" | "correct" | "wrong";

export type QuizQuestionType =
  | "idToTitle"
  | "titleToId"
  | "descToTitle"
  | "level"
  | "principle"
  | "scenario";

export type PrincipleFilter = "All" | Principle;
export type LevelFilter = "All" | "A" | "AA";
export type QuizPhase = "question" | "summary";

export type QuizQuestion = {
  criterion: Criterion;
  type: QuizQuestionType;
  kicker: string;
  cardText: string;
  prompt: string;
  options: string[];
  answer: string;
  firstTryCorrect: boolean | null;
};

export const POUR: Principle[] = [
  "Perceivable",
  "Operable",
  "Understandable",
  "Robust"
];

export const NEW_IN_22 = new Set([
  "2.4.11",
  "2.5.7",
  "2.5.8",
  "3.2.6",
  "3.3.7",
  "3.3.8"
]);

export const QUIZ_ROUND_LENGTH = 10;

// Criteria removed from WCAG 2.2 — kept in the reference guide as historical
// entries, but never quizzed and never offered as answer options.
export const OBSOLETE_IDS = new Set(["4.1.1"]);

// Long-term, cross-session first-try history per criterion. A criterion is
// "mastered" at MASTERY_STREAK consecutive first-try corrects — one lucky
// guess isn't mastery, and a later miss resets the streak.
export type MasteryEntry = { attempts: number; streak: number };
export type MasteryMap = Record<string, MasteryEntry>;
export const MASTERY_STREAK = 2;

function parseId(id: string): number[] {
  return id.split(".").map((n) => Number(n));
}

export function compareCriteria(a: Criterion, b: Criterion): number {
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

export function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getTags(item: Criterion): string[] {
  return item.tags ?? [];
}

const BRITISH_SPELLINGS: Array<[RegExp, string]> = [
  [/colour/g, "color"],
  [/behaviour/g, "behavior"],
  [/grey/g, "gray"],
  [/centre/g, "center"],
  [/organisation/g, "organization"],
  [/minimise/g, "minimize"],
  [/recognise/g, "recognize"],
  [/customise/g, "customize"]
];

export function normalizeSearchQuery(raw: string): string {
  let q = raw.trim().toLowerCase().replace(/\s+/g, " ");
  // People write criterion numbers the way the app teaches them: "WCAG 1.4.3".
  q = q.replace(/^wcag\s*/, "");
  for (const [pattern, replacement] of BRITISH_SPELLINGS) {
    q = q.replace(pattern, replacement);
  }
  return q;
}

// Criteria are static, so each haystack is tokenized once and cached.
const HAYSTACK_CACHE = new Map<string, string[]>();

function haystackWords(item: Criterion): string[] {
  let words = HAYSTACK_CACHE.get(item.id);
  if (!words) {
    words = `${item.id} ${item.title} ${
      item.keywords ?? ""
    } ${item.shortExplanation}`
      .toLowerCase()
      .split(/[^a-z0-9.]+/)
      .filter(Boolean);
    HAYSTACK_CACHE.set(item.id, words);
  }
  return words;
}

export function criterionMatches(item: Criterion, query: string): boolean {
  if (!query) return true;
  const words = haystackWords(item);
  // Every query word must start some haystack word. Word-prefix keeps "form"
  // from matching "information"; all-words (rather than contiguous phrase)
  // lets "color contrast" find 1.4.3 even though the words aren't adjacent.
  return query
    .split(" ")
    .every((queryWord) => words.some((word) => word.startsWith(queryWord)));
}

function firstSentence(text: string): string {
  const para = text.split("\n\n")[0] ?? "";
  const idx = para.indexOf(". ");
  const sentence = idx >= 0 ? para.slice(0, idx + 1) : para;
  if (sentence.length <= 180) return sentence;
  return `${sentence.slice(0, 177).replace(/\s+\S*$/, "")}…`;
}

// Distractors come from the same POUR principle when possible — plausible
// confusions (1.4.3 vs 1.4.11) teach more than obvious cross-category
// mismatches. Falls back to other principles when the pool runs thin
// (e.g. Robust), and never offers obsolete criteria.
function pickDistractorCriteria(
  criterion: Criterion,
  all: Criterion[],
  count: number
): Criterion[] {
  const eligible = all.filter(
    (c) => c.id !== criterion.id && !OBSOLETE_IDS.has(c.id)
  );
  const picked = shuffle(
    eligible.filter((c) => c.principle === criterion.principle)
  ).slice(0, count);
  if (picked.length < count) {
    const fallback = shuffle(
      eligible.filter((c) => c.principle !== criterion.principle)
    );
    picked.push(...fallback.slice(0, count - picked.length));
  }
  return picked;
}

export function buildQuizQuestion(
  criterion: Criterion,
  all: Criterion[]
): QuizQuestion {
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
  return buildQuizQuestionOfType(criterion, all, type);
}

// Builds a question of a known type — used both by buildQuizQuestion and to
// rebuild a persisted round after a reload (options reshuffle; the subject,
// type, and first-try score are what matter).
export function buildQuizQuestionOfType(
  criterion: Criterion,
  all: Criterion[],
  requestedType: QuizQuestionType
): QuizQuestion {
  // A criterion without a fail example can't host a scenario question; coerce
  // here so no caller (e.g. session restore) can build an empty-card question.
  const type: QuizQuestionType =
    requestedType === "scenario" && !criterion.example?.fail
      ? "idToTitle"
      : requestedType;
  const distractors = pickDistractorCriteria(criterion, all, 3);
  const base = { criterion, type, firstTryCorrect: null };

  // Criterion numbers are always shown with the "WCAG" prefix — that's how
  // they're referenced everywhere outside this app.
  const wcagId = (id: string) => `WCAG ${id}`;

  switch (type) {
    case "idToTitle":
      return {
        ...base,
        kicker: "Success criterion",
        cardText: wcagId(criterion.id),
        prompt: `Which success criterion is ${wcagId(criterion.id)}?`,
        options: shuffle([
          criterion.title,
          ...distractors.map((c) => c.title)
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
          wcagId(criterion.id),
          ...distractors.map((c) => wcagId(c.id))
        ]),
        answer: wcagId(criterion.id)
      };
    case "descToTitle":
      return {
        ...base,
        kicker: "Match the description",
        cardText: `“${firstSentence(criterion.shortExplanation)}”`,
        prompt: "Which success criterion does this describe?",
        options: shuffle([
          criterion.title,
          ...distractors.map((c) => c.title)
        ]),
        answer: criterion.title
      };
    case "level":
      return {
        ...base,
        kicker: "Conformance level",
        cardText: `${wcagId(criterion.id)} ${criterion.title}`,
        prompt: "What conformance level is this criterion?",
        // "Best practice" is a deliberate 4th distractor — it's a real term
        // people confuse with a conformance level, so every question stays at
        // four options without inventing a fake level.
        options: ["Level A", "Level AA", "Level AAA", "Best practice"],
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
          ...distractors.map((c) => c.title)
        ]),
        answer: criterion.title
      };
    default:
      return {
        ...base,
        kicker: "POUR principle",
        cardText: `${wcagId(criterion.id)} ${criterion.title}`,
        prompt: "Which POUR principle does this criterion belong to?",
        options: [...POUR],
        answer: criterion.principle
      };
  }
}

export function buildQuizRound(
  pool: Criterion[],
  all: Criterion[]
): QuizQuestion[] {
  return shuffle(pool)
    .slice(0, QUIZ_ROUND_LENGTH)
    .map((criterion) => buildQuizQuestion(criterion, all));
}
