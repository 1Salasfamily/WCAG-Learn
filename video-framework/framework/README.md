# WCAG Learn video framework — v1.0.0

One video per success criterion: **intro the criterion → scenario → how to
test → how to fix and retest**, bookended by the WCAG Learn logo. 8th-grade
reading level, friendly, no filler. All 56 episodes visit the same recurring
world (**Sneaker Street**, an online shoe store) so they stand alone AND read
as a collection; the outro counter (`n / 56`) ticks up each episode.

## The contract: framework vs. episodes

- **`framework/` is the framework.** Stage identity (tokens in `stage.css`),
  the timeline engine + brand intro/outro scenes (`engine.js`), and the
  pipeline (`build.mjs`). *"Edit the framework"* means these files — a change
  here affects every episode **the next time that episode is rebuilt**,
  never retroactively (rendered mp4s are immutable artifacts).
- **`episodes/<id>/` is one video.** Its script (`narration.json`), its
  metadata (`episode.json`), its teaching scenes (`scenes.html` — markup,
  episode styles, and a `window.__episodeScenes` wiring function), and its
  art (`assets/`). *"Edit episode X"* means only that directory.
- An episode records the framework version it targets in `episode.json`
  (`"framework": "1.0.0"`). Bump `FW_VERSION` in `engine.js` + this README
  on breaking framework changes, and note them below in the changelog.

## Build

```bash
cd framework
npm install                      # playwright + ffmpeg-static (first time)
npx playwright install chromium  # first time
node build.mjs ../episodes/1-1-1           # full render → episodes/1-1-1/output/
node build.mjs ../episodes/1-1-1 --smoke   # sparse frames only, fast QA
```

Pipeline: `say` (voice: Samantha) synthesizes per-scene narration → measured
durations drive the schedule → captions `.srt` → Playwright steps a
deterministic timeline frame-by-frame at 30fps, 1920×1080 → ffmpeg assembles
video and mixes narration at each scene's offset. Deterministic seeking means
output quality never depends on machine load.

## Accessibility of the videos themselves

- Open captions burned in + `.srt` sidecar (1.2.2).
- Narration is written to double as audio description — every visual beat is
  spoken (1.2.3/1.2.5 via integrated description).
- No flashing; stage colors meet contrast on all text.

## Authoring notes

- `narration.json` cues carry `cap` (caption text) and `say` (phonetic text
  for TTS — e.g. "one point one point one", "W-CAG", "button one").
- Scene windows = narration length + tail; cue times are proportional to
  `say` length within the scene's audio. Reference cue times in animations
  via the `cue(sceneId, i)` helper — never hardcode seconds.
- The engine injects s1 (logo intro), s6 (outro: takeaway/counter/site/logo),
  the caption bar, and the episode chip. Episodes define only s2–s5 (or more
  teaching scenes: the engine treats scenes[1..n-2] generically).
- Voice swap (own recording / better TTS) happens in `build.mjs` step 1 only.

## Changelog

- **1.0.0** (2026-09-24) — initial framework, extracted from the episode
  1.1.1 pilot. Stage identity = current app dark theme verbatim (revisit:
  stage tokens are intentionally separate from app UI themes).
