"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import wcagData from "@/data/wcag.json";
import {
  buildQuizQuestionOfType,
  buildQuizRound,
  compareCriteria,
  criterionMatches,
  hasTag,
  MASTERY_STREAK,
  normalizeSearchQuery,
  OBSOLETE_IDS,
  POUR
} from "./wcag";
import type {
  Criterion,
  LevelFilter,
  MasteryEntry,
  MasteryMap,
  Principle,
  PrincipleFilter,
  QuizPhase,
  QuizQuestion,
  QuizQuestionType,
  QuizState,
  ViewMode
} from "./wcag";
import Sidebar from "./Sidebar";
import TagFilterChip from "./TagFilterChip";
import ReferenceCard from "./ReferenceCard";
import Quiz, {
  FilterSelect,
  LEVEL_FILTER_OPTIONS,
  PRINCIPLE_FILTER_OPTIONS
} from "./Quiz";
import ImageOverlay from "./ImageOverlay";
import SiteTitle from "./site-title";
import { playCorrectSound, playWrongSound } from "./sounds";

// Saved-session shape for auto-resume. Questions persist as (criterion id,
// type, first-try result) and are rebuilt on restore — options may reshuffle,
// but the subject, progress, and score are preserved.
const SESSION_KEY = "wcag-learn:session:v1";
const MASTERY_KEY = "wcag-learn:mastery:v1";

// Allowed values when validating persisted payloads — localStorage contents
// are untrusted (truncated, hand-edited, or written by another app version).
const PRINCIPLE_FILTER_VALUES: PrincipleFilter[] = ["All", ...POUR];
const LEVEL_FILTER_VALUES: LevelFilter[] = ["All", "A", "AA"];
const QUESTION_TYPES: QuizQuestionType[] = [
  "idToTitle",
  "titleToId",
  "descToTitle",
  "level",
  "principle",
  "scenario"
];

// localStorage writes can throw (storage denied, private mode, quota); a
// failed persist should never take the app down.
function safeSetItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the app keeps working, it just won't persist.
  }
}

// Parse-or-remove: a corrupt payload is deleted so it can't brick every
// subsequent mount, and storage-denied environments read as "nothing saved".
function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage unavailable — nothing to clean up.
    }
    return null;
  }
}

// Restores run pre-paint so a returning user never sees a start-screen flash
// before their session pops in. useLayoutEffect warns during prerender, so
// fall back to useEffect on the server (where neither ever runs).
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function filterPool(
  pool: Criterion[],
  principle: PrincipleFilter,
  level: LevelFilter
): Criterion[] {
  return pool.filter(
    (item) =>
      (principle === "All" || item.principle === principle) &&
      (level === "All" || item.level === level)
  );
}

type SavedSession = {
  started: boolean;
  activeIndex: number;
  // Criterion id of the current card — rename-safe, preferred over the
  // deck-relative index on restore (older payloads lack it).
  activeId?: string | null;
  tagFilter?: string | null;
  quiz?: {
    round: Array<{
      id: string;
      type: QuizQuestionType;
      ftc: boolean | null;
    }>;
    index: number;
    phase: QuizPhase;
    principleFilter: PrincipleFilter;
    levelFilter: LevelFilter;
  };
};

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
  // Reference-guide tag exploration: one tag at a time narrows the deck and
  // sidebar to the criteria sharing it (Nandita's feedback — the tag pills
  // looked tappable, so now they are).
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const cards = useMemo(
    () =>
      tagFilter
        ? ordered.filter((item) => hasTag(item, tagFilter))
        : ordered,
    [ordered, tagFilter]
  );
  const [viewMode, setViewMode] = useState<ViewMode>("reference");
  const [exampleExpanded, setExampleExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quizRound, setQuizRound] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const mainStageRef = useRef<HTMLDivElement>(null);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizPrincipleFilter, setQuizPrincipleFilter] = useState<PrincipleFilter>("All");
  const [quizLevelFilter, setQuizLevelFilter] = useState<LevelFilter>("All");
  const [sidebarQuery, setSidebarQuery] = useState("");

  // Cross-session mastery: first-try history per criterion. Survives the
  // logo/Reset exits — it's learning progress, not session state.
  const [mastery, setMastery] = useState<MasteryMap>({});

  // False until the session-restore effect has run; the save effect waits for
  // it so the mount-time save can't overwrite the session being restored.
  const [sessionHydrated, setSessionHydrated] = useState(false);

  const searchQuery = normalizeSearchQuery(sidebarQuery);
  const isSearching = searchQuery.length > 0;

  const visibleGrouped = useMemo(() => {
    if (!isSearching && !tagFilter) return grouped;
    const map: Record<Principle, Criterion[]> = {
      Perceivable: [],
      Operable: [],
      Understandable: [],
      Robust: []
    };
    // Search and the tag filter compose: searching while filtered looks
    // within the tagged subset, matching what the deck shows.
    POUR.forEach((principle) => {
      map[principle] = grouped[principle].filter(
        (item) =>
          (!tagFilter || hasTag(item, tagFilter)) &&
          (!isSearching || criterionMatches(item, searchQuery))
      );
    });
    return map;
  }, [grouped, searchQuery, isSearching, tagFilter]);

  const searchMatchCount = POUR.reduce(
    (count, principle) => count + visibleGrouped[principle].length,
    0
  );

  // Quiz eligibility is defined once: quizzable excludes obsolete criteria,
  // and the active pool is quizzable narrowed by the filters.
  const quizzable = useMemo(
    () => ordered.filter((item) => !OBSOLETE_IDS.has(item.id)),
    [ordered]
  );

  const quizPool = useMemo(
    () => filterPool(quizzable, quizPrincipleFilter, quizLevelFilter),
    [quizzable, quizPrincipleFilter, quizLevelFilter]
  );

  const masteryStats = useMemo(() => {
    const perPrinciple = POUR.map((principle) => {
      const items = quizzable.filter((c) => c.principle === principle);
      const mastered = items.filter(
        (c) => (mastery[c.id]?.streak ?? 0) >= MASTERY_STREAK
      ).length;
      return { principle, mastered, total: items.length };
    });
    // "Weakest" = attempted but the most recent first try was wrong.
    const weakest = quizzable.filter((c) => {
      const entry = mastery[c.id];
      return entry !== undefined && entry.attempts > 0 && entry.streak === 0;
    });
    return {
      mastered: perPrinciple.reduce((sum, row) => sum + row.mastered, 0),
      total: quizzable.length,
      perPrinciple,
      weakest
    };
  }, [quizzable, mastery]);

  // Practice pool: long-term weak criteria plus this round's misses, deduped.
  // The union keeps the old guarantee — misses shown on the summary are always
  // practicable — even if the persisted mastery map was lost or cleared.
  const practicePool = useMemo(() => {
    const pool = new Map<string, Criterion>();
    masteryStats.weakest.forEach((c) => pool.set(c.id, c));
    quizRound.forEach((q) => {
      if (q.firstTryCorrect === false && !OBSOLETE_IDS.has(q.criterion.id)) {
        pool.set(q.criterion.id, q.criterion);
      }
    });
    return [...pool.values()];
  }, [masteryStats, quizRound]);
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
    ? "Ready. Choose Start Reference Guide or Start Quiz."
    : viewMode === "quiz"
      ? quizPhase === "summary"
        ? `Round complete: ${quizScore} of ${quizRound.length} correct.`
        : `Quiz round: question ${quizIndex + 1} of ${quizRound.length}`
      : `Viewing ${activeIndex + 1} of ${cards.length}: ${current.id} ${current.title}` +
        (tagFilter ? ` — filtered by ${tagFilter}` : "");

  // Only the expanded example image is transient across navigation. Quiz
  // answer state must survive reference-guide detours so a resumed round
  // re-presents the current question exactly as the user left it.
  function resetTransientUI() {
    setExampleExpanded(false);
  }

  // On small screens the stage scrolls internally and Next/answer buttons sit
  // near the bottom, so each newly presented card, question, or summary should
  // present from the top. Scroll only — focus stays on the activated button by
  // design.
  function resetStageScroll() {
    mainStageRef.current?.scrollTo(0, 0);
  }

  // The five pieces of per-round state that must always reset together.
  function dealRound(round: QuizQuestion[]) {
    setQuizRound(round);
    setQuizIndex(0);
    setQuizPhase("question");
    setQuizState("idle");
    setSelectedOption(null);
    resetStageScroll();
  }

  function startNewRound() {
    dealRound(buildQuizRound(quizPool, ordered));
  }

  // Landscape-short phones hide the site header (and its Reset button), so
  // the quiz drawer offers the same fresh-round action. Dealing a new round
  // is a discrete jump: the drawer closes and focus presents the question.
  function startNewRoundFromDrawer() {
    setIsSidebarOpen(false);
    startNewRound();
    focusCriterionCard();
  }

  // Practice weakest: long-term weak criteria plus this round's misses. The
  // pool spans all principles and levels, so the filters reset to All — the
  // dropdowns above the quiz must describe the round they sit over.
  function startWeakestRound() {
    if (practicePool.length === 0) return;
    setQuizPrincipleFilter("All");
    setQuizLevelFilter("All");
    dealRound(buildQuizRound(practicePool, ordered));
  }

  // Committing a filter deals a fresh round from the new pool — rounds are
  // dealt only in event handlers, so nothing can wipe one as a side effect.
  function applyPrincipleFilter(value: PrincipleFilter) {
    setQuizPrincipleFilter(value);
    dealRound(
      buildQuizRound(filterPool(quizzable, value, quizLevelFilter), ordered)
    );
  }

  function applyLevelFilter(value: LevelFilter) {
    setQuizLevelFilter(value);
    dealRound(
      buildQuizRound(filterPool(quizzable, quizPrincipleFilter, value), ordered)
    );
  }

  // Next question / See results unmount the button that was activated, so
  // focus can't stay on it (it would fall to the body and dump screen-reader
  // users out of the page). Per the focus principle, an unmounting control
  // makes this a discrete jump: focus presents the new question or summary.
  function goToNextQuestion() {
    if (quizIndex + 1 >= quizRound.length) {
      setQuizPhase("summary");
      resetStageScroll();
      focusCriterionCard();
      return;
    }
    setQuizIndex((prev) => prev + 1);
    setQuizState("idle");
    setSelectedOption(null);
    resetStageScroll();
    focusCriterionCard();
  }

  // The two start-screen buttons enter a mode directly. Reference is always
  // in order (the sidebar is ordered by POUR regardless); starting the quiz
  // deals a fresh shuffled round.
  function start(mode: ViewMode) {
    setTagFilter(null);
    setActiveIndex(0);
    setViewMode(mode);
    resetTransientUI();
    resetStageScroll();
    setStarted(true);
    if (mode === "quiz") {
      dealRound(buildQuizRound(quizPool, ordered));
    } else {
      // A leftover round from before a logo-home exit shouldn't resume via
      // the mode toggle; the toggle deals fresh when the round is empty.
      setQuizRound([]);
    }
    safeSetItem("wcag-learn:view-mode", mode);
  }

  // Move focus onto the selected criterion's summary card so keyboard and
  // screen-reader users land directly on the chosen content — the same region
  // the "Skip to main content" link and sidebar selection target.
  function focusCriterionCard() {
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>(".reference-topbar") ??
        document.querySelector<HTMLElement>(".quiz-card") ??
        document.querySelector<HTMLElement>(".quiz-summary") ??
        document.querySelector<HTMLElement>(".learn-main");
      if (!target) return;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      // Present from the top of the stage rather than scrolling the card
      // flush to it — anything above the card (the tag filter chip) must
      // stay in view. preventScroll stops focus() from re-scrolling.
      target.focus({ preventScroll: true });
      resetStageScroll();
    });
  }

  function goBack() {
    if (!started) return;
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
    resetTransientUI();
    resetStageScroll();
    // No focus move here: Next/Back is sequential browsing, so focus stays on
    // the button for repeated activation. The aria-live status announces each
    // card change.
  }

  function goNext() {
    if (!started) return;
    setActiveIndex((prev) => (prev + 1) % cards.length);
    resetTransientUI();
    resetStageScroll();
  }

  // Every way out of tag exploration keeps the current card current: the
  // filter drops and the index remaps into the full deck.
  function exitTagFilter() {
    const currentId = current?.id;
    setTagFilter(null);
    setActiveIndex(
      Math.max(
        0,
        ordered.findIndex((item) => item.id === currentId)
      )
    );
  }

  // Tag pills toggle one filter at a time. The tapped pill is always on the
  // current card, so the card stays current — only its position and the deck
  // count change; focus stays on the pill and the live status announces.
  function toggleTagFilter(tag: string) {
    if (tagFilter === tag) {
      exitTagFilter();
      return;
    }
    const currentId = current?.id;
    const filtered = ordered.filter((item) => hasTag(item, tag));
    const idx = filtered.findIndex((item) => item.id === currentId);
    setTagFilter(tag);
    setActiveIndex(Math.max(0, idx));
    // Present the filtered view from the top so the chip that just appeared
    // above the card is on screen.
    resetStageScroll();
  }

  // The chip's "Show all" exit removes its own button, so this is a discrete
  // jump: focus moves to the criterion card, per the focus principle.
  function clearTagFilter() {
    if (!tagFilter) return;
    exitTagFilter();
    setIsSidebarOpen(false);
    focusCriterionCard();
  }

  function jumpToCriterion(id: string) {
    // The sidebar that calls this only renders while started and in
    // reference mode, so `cards` is always the active deck here.
    const idx = cards.findIndex((item) => item.id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      resetTransientUI();
      setIsSidebarOpen(false);
      focusCriterionCard();
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

  // Mode changes from the drawer are discrete jumps: the drawer closes (via
  // setMode) and focus presents the new mode's card. The desktop top toggle
  // keeps focus on the toggle button, so it calls setMode directly.
  function switchModeFromDrawer(mode: ViewMode) {
    setMode(mode);
    focusCriterionCard();
  }

  function setMode(mode: ViewMode) {
    setViewMode(mode);
    setExampleExpanded(false);
    setIsSidebarOpen(false);
    resetStageScroll();
    // Tag exploration is a reference-guide concept; leaving for the quiz ends
    // it. Keep the current card so returning to reference lands on it.
    if (mode === "quiz" && tagFilter) {
      exitTagFilter();
    }
    // Entering the quiz with no round in hand deals one; an in-progress round
    // (or its summary) resumes untouched — quizState/selectedOption included,
    // so the current question re-presents exactly as the user left it.
    if (mode === "quiz" && quizRound.length === 0) {
      dealRound(buildQuizRound(quizPool, ordered));
    }
    safeSetItem("wcag-learn:view-mode", mode);
  }

  function handleQuizOptionPick(option: string) {
    if (!currentQuestion || quizState === "correct") return;
    setSelectedOption(option);
    const isCorrect = option === currentQuestion.answer;
    setQuizState(isCorrect ? "correct" : "wrong");
    // Called only from the user's own activation (tap or digit key), so the
    // audio context may start here; each wrong retry replays its sound.
    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
    // Long-term mastery records first tries only — retries after a wrong
    // answer don't count toward (or against) the streak.
    if (currentQuestion.firstTryCorrect === null) {
      const id = currentQuestion.criterion.id;
      setMastery((prev) => {
        const entry = prev[id] ?? { attempts: 0, streak: 0 };
        return {
          ...prev,
          [id]: {
            attempts: entry.attempts + 1,
            streak: isCorrect ? entry.streak + 1 : 0
          }
        };
      });
    }
    setQuizRound((prev) =>
      prev.map((q, i) =>
        i === quizIndex && q.firstTryCorrect === null
          ? { ...q, firstTryCorrect: isCorrect }
          : q
      )
    );
  }

  useClientLayoutEffect(() => {
    // Mastery payloads are untrusted: JSON.parse("null") succeeds, so shape-
    // validate every entry instead of letting a bad value crash the render.
    const parsed = readJSON<unknown>(MASTERY_KEY);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return;
    }
    const cleaned: MasteryMap = {};
    for (const [id, entry] of Object.entries(parsed)) {
      const candidate = entry as MasteryEntry | null;
      if (
        candidate &&
        typeof candidate.attempts === "number" &&
        typeof candidate.streak === "number"
      ) {
        cleaned[id] = {
          attempts: candidate.attempts,
          streak: candidate.streak
        };
      }
    }
    if (Object.keys(cleaned).length > 0) setMastery(cleaned);
  }, []);

  useEffect(() => {
    // Entries are only ever added or updated, so an empty map is always the
    // pre-load initial state — persisting it would clobber saved history
    // (StrictMode runs mount effects twice, interleaving save with load).
    if (Object.keys(mastery).length === 0) return;
    safeSetItem(MASTERY_KEY, JSON.stringify(mastery));
  }, [mastery]);

  useClientLayoutEffect(() => {
    // Auto-resume: restore the saved session so a reload, an About-page
    // detour, or a mobile tab eviction doesn't lose the user's place. The
    // logo and Reset remain the intentional ways to leave/restart. Payload
    // fields are validated individually — a partial or tampered payload
    // degrades to defaults instead of crashing or discarding the round.
    // Runs pre-paint so returning users never see a start-screen flash.
    try {
      const stored = window.localStorage.getItem("wcag-learn:view-mode");
      const mode: ViewMode =
        stored === "reference" || stored === "quiz" ? stored : "reference";
      setViewMode(mode);

      const saved = readJSON<Partial<SavedSession>>(SESSION_KEY);
      if (!saved || saved.started !== true) return;
      setStarted(true);
      // A saved tag is only honored in reference mode (entering the quiz
      // always ends tag exploration, and a debounced save can lag the
      // synchronous mode key) and only if it still selects at least one
      // criterion in the current data.
      const savedTag =
        mode === "reference" &&
        typeof saved.tagFilter === "string" &&
        ordered.some((item) => hasTag(item, saved.tagFilter as string))
          ? saved.tagFilter
          : null;
      setTagFilter(savedTag);
      // Prefer the saved criterion id — it survives tag renames and deck
      // changes; the raw index (older payloads) clamps to the deck.
      const deck = savedTag
        ? ordered.filter((item) => hasTag(item, savedTag))
        : ordered;
      const idIndex =
        typeof saved.activeId === "string"
          ? deck.findIndex((item) => item.id === saved.activeId)
          : -1;
      const savedActive =
        typeof saved.activeIndex === "number" ? saved.activeIndex : 0;
      setActiveIndex(
        idIndex >= 0
          ? idIndex
          : Math.min(Math.max(0, savedActive), deck.length - 1)
      );

      const quiz = saved.quiz;
      const principleFilter = PRINCIPLE_FILTER_VALUES.includes(
        quiz?.principleFilter as PrincipleFilter
      )
        ? (quiz?.principleFilter as PrincipleFilter)
        : "All";
      const levelFilter = LEVEL_FILTER_VALUES.includes(
        quiz?.levelFilter as LevelFilter
      )
        ? (quiz?.levelFilter as LevelFilter)
        : "All";
      setQuizPrincipleFilter(principleFilter);
      setQuizLevelFilter(levelFilter);

      const savedIndex =
        typeof quiz?.index === "number" ? Math.max(0, quiz.index) : 0;
      const round: QuizQuestion[] = [];
      // Entries dropped before the saved index shift the round down; count
      // survivors below it so resume lands on the same question, not one past.
      let index = 0;
      (Array.isArray(quiz?.round) ? quiz.round : []).forEach(
        (entry, originalIndex) => {
          if (
            !entry ||
            typeof entry.id !== "string" ||
            OBSOLETE_IDS.has(entry.id)
          ) {
            return;
          }
          const criterion = ordered.find((c) => c.id === entry.id);
          if (!criterion) return;
          const type = QUESTION_TYPES.includes(entry.type)
            ? entry.type
            : "idToTitle";
          round.push({
            ...buildQuizQuestionOfType(criterion, ordered, type),
            firstTryCorrect:
              entry.ftc === true ? true : entry.ftc === false ? false : null
          });
          if (originalIndex < savedIndex) index += 1;
        }
      );
      if (round.length > 0) {
        setQuizRound(round);
        setQuizIndex(Math.min(index, round.length - 1));
        setQuizPhase(quiz?.phase === "summary" ? "summary" : "question");
      } else if (mode === "quiz") {
        // Resumed into quiz mode with nothing to resume — deal fresh.
        dealRound(
          buildQuizRound(
            filterPool(quizzable, principleFilter, levelFilter),
            ordered
          )
        );
      }
    } catch {
      // A restore bug must not brick startup — drop the payload and start
      // clean rather than crash on every subsequent mount.
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch {
        // Storage unavailable — nothing to clean up.
      }
    } finally {
      // Saves are suppressed until restore has run, so the mount-time save
      // can't clobber the session it is about to restore.
      setSessionHydrated(true);
    }
  }, [ordered, quizzable]);

  // The session snapshot is serialized once per state change, debounced to a
  // single write (arrow-key card navigation would otherwise write per key
  // repeat), and flushed on pagehide so a closing tab keeps its last state.
  const sessionPayload = useMemo(
    () =>
      JSON.stringify({
        started,
        activeIndex,
        activeId: cards[activeIndex]?.id ?? null,
        tagFilter,
        quiz: {
          round: quizRound.map((q) => ({
            id: q.criterion.id,
            type: q.type,
            ftc: q.firstTryCorrect
          })),
          index: quizIndex,
          phase: quizPhase,
          principleFilter: quizPrincipleFilter,
          levelFilter: quizLevelFilter
        }
      } satisfies SavedSession),
    [
      started,
      activeIndex,
      cards,
      tagFilter,
      quizRound,
      quizIndex,
      quizPhase,
      quizPrincipleFilter,
      quizLevelFilter
    ]
  );
  const sessionPayloadRef = useRef(sessionPayload);
  sessionPayloadRef.current = sessionPayload;

  useEffect(() => {
    if (!sessionHydrated) return;
    const id = window.setTimeout(() => {
      safeSetItem(SESSION_KEY, sessionPayload);
    }, 250);
    return () => window.clearTimeout(id);
  }, [sessionHydrated, sessionPayload]);

  useEffect(() => {
    if (!sessionHydrated) return;
    function flush() {
      safeSetItem(SESSION_KEY, sessionPayloadRef.current);
    }
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [sessionHydrated]);

  useEffect(() => {
    // Reset only clears the current quiz's progress — a fresh shuffled round
    // within the active filters — rather than returning to the start screen.
    function onReset() {
      startNewRound();
    }

    window.addEventListener("wcag-learn:reset", onReset);
    return () => window.removeEventListener("wcag-learn:reset", onReset);
  }, [quizPool, ordered]);

  useEffect(() => {
    // The site logo returns to the start screen from anywhere in the app.
    function onHome() {
      setTagFilter(null);
      setActiveIndex(0);
      setIsSidebarOpen(false);
      resetTransientUI();
      resetStageScroll();
      setStarted(false);
    }

    window.addEventListener("wcag-learn:home", onHome);
    return () => window.removeEventListener("wcag-learn:home", onHome);
  }, [ordered]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("wcag-learn:state", { detail: { started, viewMode } })
    );
  }, [started, viewMode]);

  useEffect(() => {
    // Landscape-short CSS hides the site header only while the app is
    // running (its logo moves into the top row); the start screen and the
    // static pages keep the full header. The body class is the only way the
    // layout-owned header can see page state.
    document.body.classList.toggle("app-started", started);
    return () => document.body.classList.remove("app-started");
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
        target.tagName === "SELECT" ||
        target.isContentEditable);
    // isSidebarOpen: with a drawer open, digits/arrows must not act on the
    // question or card hidden behind the backdrop.
    if (isEditable || exampleExpanded || isSidebarOpen || !started) return;
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

  // Rendered inside the reference drawer (above the POUR nav) and as the
  // whole body of the quiz drawer. Hidden on desktop, where the top toggle
  // remains the mode switch.
  const modeSection = started ? (
    <div className="sidebar-mode-section">
      <p className="sidebar-mode-label" id="drawer-mode-label">
        Mode
      </p>
      <div role="group" aria-labelledby="drawer-mode-label">
        {(
          [
            ["reference", "Reference Guide"],
            ["quiz", "Flashcard Quiz"]
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            className={`sidebar-mode-row ${viewMode === mode ? "active" : ""}`}
            aria-pressed={viewMode === mode}
            onClick={() => switchModeFromDrawer(mode)}
          >
            {label}
            {viewMode === mode ? <span aria-hidden="true"> ✓</span> : null}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  // The menu button's four announcement states, stated flatly instead of
  // nested inline ternaries.
  const menuLabel =
    viewMode === "reference"
      ? (isSidebarOpen
          ? "Close POUR navigation menu"
          : "Open POUR navigation menu") +
        (tagFilter
          ? ` — filtered by ${tagFilter}, ${cards.length} criteria`
          : "")
      : isSidebarOpen
        ? "Close menu"
        : "Open menu";

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
          totalCount={cards.length}
          visibleGrouped={visibleGrouped}
          expanded={expanded}
          onToggleSection={toggleSection}
          currentId={current?.id}
          onJump={jumpToCriterion}
          tagFilter={tagFilter}
          onClearTagFilter={clearTagFilter}
          modeSection={modeSection}
        />
      ) : null}

      {started && viewMode === "quiz" ? (
        <nav
          id="mode-drawer"
          className={`learn-sidebar quiz-drawer ${isSidebarOpen ? "open" : ""}`}
          aria-label="Menu"
        >
          <h3 className="sidebar-title">Menu</h3>
          {modeSection}
          {/* Landscape-short phones only (CSS-gated): the filter row and the
              header Reset are hidden there to spend height on the card, so
              their jobs move into this drawer. */}
          <div className="sidebar-quiz-tools">
            <p className="sidebar-mode-label" id="drawer-filters-label">
              Round filters
            </p>
            <div
              className="sidebar-quiz-filters"
              role="group"
              aria-labelledby="drawer-filters-label"
            >
              <FilterSelect<PrincipleFilter>
                label="Principle"
                value={quizPrincipleFilter}
                onCommit={applyPrincipleFilter}
                options={PRINCIPLE_FILTER_OPTIONS}
              />
              <FilterSelect<LevelFilter>
                label="Level"
                value={quizLevelFilter}
                onCommit={applyLevelFilter}
                options={LEVEL_FILTER_OPTIONS}
              />
            </div>
            <button
              className="sidebar-mode-row"
              onClick={startNewRoundFromDrawer}
            >
              New round
            </button>
          </div>
        </nav>
      ) : null}

      {started && isSidebarOpen ? (
        <button
          className={`sidebar-backdrop ${viewMode === "quiz" ? "quiz-drawer-backdrop" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      ) : null}

      <div className="learn-main" tabIndex={-1} aria-label="Main study content">
        <div className="learn-top-row">
          <div className="top-left-group">
            {started ? (
              <button
                className={`sidebar-toggle ${viewMode === "quiz" ? "sidebar-toggle-quiz" : ""}`}
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-expanded={isSidebarOpen}
                aria-controls={viewMode === "reference" ? "pour-sidebar" : "mode-drawer"}
                aria-label={menuLabel}
              >
                ☰
                {viewMode === "reference" && tagFilter ? (
                  <span className="sidebar-toggle-badge" aria-hidden="true">
                    {cards.length}
                  </span>
                ) : null}
              </button>
            ) : null}

            {/* Landscape-short only (CSS-gated): the site header hides while
                the app runs, so the brand/home link joins the top row. */}
            <span className="top-row-logo">
              <SiteTitle />
            </span>

            {/* Skip-link landing in the guide (id + tabindex make it a
                native fragment-navigation target): announces the position
                and criterion title on arrival. */}
            <p
              className="status-text"
              id="study-status"
              tabIndex={-1}
              aria-live="polite"
            >
              {statusText}
              {started && viewMode === "reference" ? (
                <span className="status-principle-chip">{current.principle.toUpperCase()}</span>
              ) : null}
              {/* Landscape-short only (CSS-gated); the in-card progress row
                  is hidden there, so this is the sole score indicator. */}
              {started && viewMode === "quiz" && quizPhase === "question" ? (
                <span className="quiz-score-chip status-score-chip">
                  Score: {quizScore}
                </span>
              ) : null}
            </p>
          </div>

          {started ? (
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
          ) : null}
        </div>

        <div className="main-stage" ref={mainStageRef}>
          {!started ? (
            <section className="start-screen" aria-label="Start screen">
              <p className="start-screen-eyebrow">Get started</p>
              <p className="start-screen-title">WCAG Learn</p>
              <p className="start-screen-sub">
                Flashcards and a quick-reference guide for all{" "}
                {quizzable.length} WCAG 2.1 and 2.2 success criteria.
              </p>
              <ul className="start-screen-stats" aria-label="What's included">
                <li className="start-screen-stat">WCAG 2.1 &amp; 2.2</li>
                <li className="start-screen-stat">Levels A &amp; AA</li>
                <li className="start-screen-stat">POUR principles</li>
              </ul>
              <div className="start-row" role="group" aria-label="Start modes">
                <button className="start-button start-button-primary" onClick={() => start("reference")}>
                  Start Reference Guide
                </button>
                <button className="start-button" onClick={() => start("quiz")}>
                  Start Quiz
                </button>
              </div>
            </section>
          ) : (
            <section
              className={`study-shell ${
                viewMode === "reference" ? "study-shell-reference" : ""
              }`}
              aria-label="Flashcard study interface"
            >
              {/* card-stack-quiz drives the landscape-short two-column
                  question layout; the summary keeps the single column. */}
              <div
                className={`card-stack ${
                  viewMode === "quiz" && quizPhase === "question"
                    ? "card-stack-quiz"
                    : ""
                }`}
              >
                {viewMode === "quiz" ? (
                  <Quiz
                    principleFilter={quizPrincipleFilter}
                    onPrincipleFilter={applyPrincipleFilter}
                    levelFilter={quizLevelFilter}
                    onLevelFilter={applyLevelFilter}
                    phase={quizPhase}
                    question={currentQuestion}
                    index={quizIndex}
                    round={quizRound}
                    score={quizScore}
                    state={quizState}
                    selectedOption={selectedOption}
                    onPick={handleQuizOptionPick}
                    onNext={goToNextQuestion}
                    mastered={masteryStats.mastered}
                    masteryTotal={masteryStats.total}
                    perPrinciple={masteryStats.perPrinciple}
                    weakestCount={practicePool.length}
                    onPracticeWeakest={() => {
                      // These three summary actions unmount the summary (and
                      // the button that was activated), so each is a discrete
                      // jump: focus presents what replaces it. Header Reset
                      // and the drawer rows persist and keep their own focus.
                      startWeakestRound();
                      focusCriterionCard();
                    }}
                    onNewRound={() => {
                      startNewRound();
                      focusCriterionCard();
                    }}
                    onReviewGuide={() => {
                      setMode("reference");
                      focusCriterionCard();
                    }}
                  />
                ) : (
                  <>
                    {tagFilter ? (
                      <TagFilterChip
                        tag={tagFilter}
                        count={cards.length}
                        onClear={clearTagFilter}
                      />
                    ) : null}
                    <ReferenceCard
                      criterion={current}
                      imageSrc={currentImageSrc}
                      sections={detailSections}
                      onExpandImage={toggleExampleExpanded}
                      activeTag={tagFilter}
                      onToggleTag={toggleTagFilter}
                    />
                  </>
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
