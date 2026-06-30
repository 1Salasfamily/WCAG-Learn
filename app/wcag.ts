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
  assistiveTech?: string[];
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

const principleTechMap: Record<Principle, string[]> = {
  Perceivable: ["Screen Reader", "Braille Display", "Captions/Media Support"],
  Operable: ["Keyboard Navigation", "Switch Control", "Voice Control"],
  Understandable: ["Screen Reader", "Cognitive Support Tools", "Input Assistance"],
  Robust: ["Screen Reader", "Assistive Browser Tech", "AT Compatibility"]
};

export function getAssistiveTech(item: Criterion): string[] {
  if (item.assistiveTech && item.assistiveTech.length > 0) {
    return item.assistiveTech;
  }
  return principleTechMap[item.principle];
}

function firstSentence(text: string): string {
  const para = text.split("\n\n")[0] ?? "";
  const idx = para.indexOf(". ");
  const sentence = idx >= 0 ? para.slice(0, idx + 1) : para;
  if (sentence.length <= 180) return sentence;
  return `${sentence.slice(0, 177).replace(/\s+\S*$/, "")}…`;
}

function pickDistractors(
  pool: string[],
  answer: string,
  count: number
): string[] {
  return shuffle(pool.filter((item) => item !== answer)).slice(0, count);
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
  const titles = all.map((c) => c.title);
  const ids = all.map((c) => c.id);
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
          ...pickDistractors(titles, criterion.title, 3)
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
          ...pickDistractors(ids, criterion.id, 3).map(wcagId)
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
          ...pickDistractors(titles, criterion.title, 3)
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
          ...pickDistractors(titles, criterion.title, 3)
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
