# WCAG Learn video framework — design charter (v1.2.0)

This file is the committed visual world for the video series. Every episode
is built against it and verified against it before render. One style per
project: the theater stage below. No blending in other styles, no
per-episode aesthetic drift. (Per awesome-design's law: the style file
wins; per impeccable: the committed world outranks habit.)

## 1. The committed world: the theater stage

- **The stage** is the brand's navy auditorium (`body.theater`): deep navy
  gradients, one gold proscenium thread, gold + Space Mono as brand
  constants, Schibsted Grotesk as the voice. It is deliberately **neither**
  of the app's UI themes, so the videos never age against the app's
  light/dark roadmap.
- **The depicted web** appears as `.site-card.light` / `.site-card.dark`
  artifacts carrying their own theme. Teaching examples default to light
  cards (the web the audience fixes is mostly light); dark cards exist for
  continuity and for dual-theme frames (contrast episodes).
- **Annotations** (`.annotation.good/.bad`) are stage furniture: they live
  stage-left (or a reserved column), carry a stem pointing at their
  evidence, and NEVER occlude what they cite.
- **Frame grid (1920×1080):** context band (top 140px) · content zone ·
  caption band (bottom 200px). Only stage furniture (captions, episode
  chip) enters the caption band.
- **Locks:** gold is the only accent (semantic green/red are feedback, not
  accents). Radius system: cards 20–24px, chips/pills full-round, code and
  badges 10–14px. One radius system per frame; no drift.

## 2. Series architecture and tone (the dial board)

Two productions, two settings (taste-skill dials: variance / motion /
density):

| Production | Dials | Tone |
|---|---|---|
| **Opener** (`episodes/000-intro`) | 8 / 8 / 3 | Enthusiastic, showy, full pantomime. Sells the collection: what this is, what it does for you, the real wcaglearn.com on stage. The one place the stage gets to perform. |
| **Teaching episodes** (56) | 6 / 5 / 3 | To the point. The viewer already saw the pitch. No welcome, no throat-clearing: criterion → scenario → test → fix → out. Warmth comes from clarity, not enthusiasm. |

Episode narration formula (unchanged): introduce → scenario → how to test
→ how to fix and retest, bookended by the logo scenes. 8th-grade reading
level. Every criterion visits Sneaker Street; the outro counter ticks up.

## 3. Motion law (Emil Kowalski, adapted to the video medium)

- **Easing tokens:** entrances `cubic-bezier(0.32, 0.72, 0, 1)` (the
  engine's `EASE`); constant motion (camera pans, marquees) `linear`;
  on-screen morphs `cubic-bezier(0.77, 0, 0.175, 1)`. Never `ease-in`.
- **Nothing enters from `scale(0)`.** Pops start at `scale(0.85)`+fade.
- **Stagger** grouped entrances 50–80ms; sequence-on-cue (elements timed to
  narration beats) is storytelling, not stagger, and follows the script.
- **One authored moment per scene.** Each scene gets one signature move
  (the camera pan, the typewriter, the verdict pop); everything else is
  quiet entrances. Motion must be justifiable in one sentence: hierarchy,
  storytelling, feedback, or state change.
- **Asymmetric timing:** reveals may be deliberate; removals are quick.
- **Review in slow motion.** The frame-by-frame QA pass (reading rendered
  frames at cue boundaries) is mandatory before shipping a render.

## 4. Anti-slop rules (taste-skill, binding for all display text)

- **No em-dashes (`—`) or en-dashes in on-screen display text or
  captions.** Use commas, periods, or colons. (Narration `say` strings may
  keep them purely as TTS pause hints; they are never displayed.)
- **Copy self-audit before every render:** re-read every visible string;
  rewrite anything grammatically broken, cutely hollow, or AI-flavored.
- **No decorative labels:** no section numbers, version stamps, locale
  strips, scroll cues, status dots, or pills overlaid on imagery. The
  episode chip and context bar are the only persistent labels.
- **Real content:** product copy on site-cards reads like a real store;
  numbers are plausible; no lorem, no "Acme", no filler verbs
  ("elevate", "seamless", "unleash").
- **Quotes** (screen-reader speech) are short, in real typographic quotes.

## 5. WCAG 2.2 AA — the videos must conform (binding)

The series teaches WCAG; the artifacts conform to it. Per render:

- **1.2.2 Captions:** open captions burned into every narrated frame
  (verbatim), plus a `.srt` sidecar shipped with every mp4.
- **1.2.3 / 1.2.5 Audio description:** narration is written as integrated
  description: every visual beat that carries meaning is spoken. Rule of
  thumb: the episode must make full sense with the screen off.
- **1.4.2 Audio control:** narration only; no autoplaying background bed
  that fights speech. If music is ever added, it ducks under narration and
  the mix keeps speech ≥ 20dB clear.
- **2.3.1 Three flashes:** nothing flashes more than 3× per second; no
  strobe cuts, no full-frame luminance snaps. Scene transitions are fades
  or holds.
- **Contrast of burned-in text:** every on-stage text meets ≥ 4.5:1
  (≥ 3:1 for ≥ 24px bold display) against its actual backdrop. Stage
  tokens are pre-verified: captions white-on-`rgba(4,6,10,.88)`, muted
  `#a8b2c4` on navy, annotation greens/reds on their dark fills, site-card
  inks on their surfaces. New color pairs must be checked before use.
- **Motion comfort:** camera moves are slow pans/zooms (no shake, no spin,
  no parallax stacking); large moves fade rather than fly. (Video files
  can't honor `prefers-reduced-motion`, so the default itself is the
  gentle version.)
- **When embedded on wcaglearn.com:** the player must expose captions,
  pause, and volume; poster frames meet contrast; no autoplay with sound.

## 6. The verification gate (every render)

1. Frame QA at every cue boundary (the slow-motion review).
2. Caption/narration parity check (srt text = spoken text).
3. Contrast spot-check on any new color pair.
4. Copy self-audit (section 4).
5. Confirm against this file: locks held, dials right, motion justified.

## Provenance

Distilled 2026-09-24 from four skills at Justin's direction: impeccable
(craft floor, verification discipline, refinement-vs-redesign law),
taste-skill (dials, anti-slop tells, copy audit), Emil Kowalski design
engineering (easing, entrance, stagger, slow-motion review), and
awesome-design (one committed style file, verify against it). The skills
inform this charter; the charter, not the skills, is what binds episodes.
