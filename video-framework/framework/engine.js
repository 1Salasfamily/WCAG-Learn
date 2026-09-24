// WCAG Learn video framework — ENGINE (framework v1.0.0)
// Deterministic, seekable timeline + the brand scenes every episode shares
// (logo intro, logo outro, caption bar, episode chip). An episode page
// defines its teaching scenes (markup + window.__episodeScenes) and the
// engine handles everything else. Rendering steps frame by frame via
// __seek, so output quality is independent of machine speed.
window.FW_VERSION = "1.0.0";

let ANIMS = [];
let SCENES = [];
let CUES = [];
let META = null;

const el = (id) => document.getElementById(id);
const EASE = "cubic-bezier(.32,.72,0,1)";

function anim(target, keyframes, start, dur, easing = EASE) {
  const a = target.animate(keyframes, {
    delay: start * 1000,
    duration: Math.max(dur * 1000, 1),
    fill: "both",
    easing
  });
  a.pause();
  ANIMS.push(a);
  return a;
}
const fadeUp = (t, s, d = 0.55) =>
  anim(t, [{ opacity: 0, transform: "translateY(46px)" }, { opacity: 1, transform: "translateY(0)" }], s, d);
const pop = (t, s, d = 0.5) =>
  anim(t, [{ opacity: 0, transform: "scale(0.72)" }, { opacity: 1, transform: "scale(1)" }], s, d);

// ---- brand DOM, injected so episode pages never repeat it ----
function buildBrandDom(meta) {
  const A = meta.assetsBase ?? "../../framework/assets/";
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<section class="scene" id="s1">
      <div class="logo-center">
        <div style="position:relative; display:flex; align-items:center; justify-content:center;">
          <div class="wring" id="fw-ring1"></div>
          <img class="wmark" id="fw-mark1" src="${A}wcag-learn-favicon.svg" alt="">
        </div>
        <img class="lockup" id="fw-lockup" src="${A}wcag-learn-lockup-dark.svg" alt="">
        <div class="goldline" id="fw-line"></div>
      </div>
    </section>`
  );
  document.body.insertAdjacentHTML(
    "beforeend",
    `<section class="scene" id="s6">
      <div class="outro-wrap">
        <div class="takeaway" id="fw-take"><span class="n">${meta.number}</span> — ${meta.takeaway}</div>
        <div class="counter" id="fw-count"><span class="done">${meta.counterDone}</span> / ${meta.counterTotal ?? 56} criteria</div>
        <div class="site" id="fw-site">wcaglearn.com</div>
        <div class="outro-logo">
          <div class="wring" id="fw-ring2" style="width:150px; height:150px; border-radius:36px;"></div>
          <img class="wmark" id="fw-mark2" style="width:120px; height:120px;" src="${A}wcag-learn-favicon.svg" alt="">
        </div>
      </div>
    </section>
    <div id="chipmark"><span class="n">${meta.number}</span> ${meta.title}</div>
    <div id="capbar"></div>`
  );
}

function brandAnims(S) {
  const first = SCENES[0], last = SCENES[SCENES.length - 1];
  { // intro
    const t0 = first.start, tEnd = first.end;
    pop(el("fw-mark1"), t0 + 0.15, 0.6);
    anim(el("fw-ring1"), [
      { opacity: 0, transform: "scale(0.7)" },
      { opacity: 0.9, transform: "scale(1)", offset: 0.55 },
      { opacity: 0, transform: "scale(1.35)" }
    ], t0 + 0.35, 1.2);
    fadeUp(el("fw-lockup"), t0 + 0.7, 0.6);
    anim(el("fw-line"), [{ width: "0px" }, { width: "520px" }], t0 + 0.95, 0.8);
    anim(el("s1"), [{ opacity: 1 }, { opacity: 0 }], tEnd - 0.45, 0.45, "ease-in");
  }
  { // outro
    const cue = (i) => last.cues[i] ?? { start: last.start, end: last.end };
    fadeUp(el("fw-take"), cue(0).start, 0.55);
    pop(el("fw-count"), cue(1).start, 0.5);
    fadeUp(el("fw-site"), cue(2).start, 0.5);
    pop(el("fw-mark2"), cue(2).start + 0.3, 0.55);
    anim(el("fw-ring2"), [
      { opacity: 0, transform: "scale(0.75)" },
      { opacity: 0.9, transform: "scale(1.05)", offset: 0.45 },
      { opacity: 0, transform: "scale(1.5)" }
    ], cue(2).end + 0.1, 1.4);
  }
}

// schedule: {scenes:[{id,start,end,cues:[{start,end,cap}]}]}
// meta: episode.json (number, title, takeaway, counterDone, ...)
function __init(schedule, meta) {
  ANIMS = [];
  META = meta;
  SCENES = schedule.scenes;
  CUES = SCENES.flatMap((s) => s.cues);
  buildBrandDom(meta);
  const S = Object.fromEntries(SCENES.map((s) => [s.id, s]));
  const cue = (sid, i) => S[sid].cues[i] ?? { start: S[sid].start, end: S[sid].end };
  brandAnims(S);
  // The episode's teaching scenes wire themselves up here.
  window.__episodeScenes({ S, cue, el, anim, fadeUp, pop, EASE });
}

function __seek(ms) {
  const t = ms / 1000;
  for (const s of SCENES) {
    el(s.id).style.display = t >= s.start && t < s.end ? "block" : "none";
  }
  // watermark chip through the teaching scenes (2nd..2nd-to-last)
  const chipFrom = SCENES[1].start + 1;
  const chipTo = SCENES[SCENES.length - 2].end;
  el("chipmark").style.display = t >= chipFrom && t < chipTo ? "flex" : "none";
  for (const a of ANIMS) { a.pause(); a.currentTime = ms; }
  const c = CUES.find((c) => t >= c.start && t < c.end);
  const bar = el("capbar");
  if (c) { bar.textContent = c.cap; bar.style.display = "block"; }
  else bar.style.display = "none";
}
window.__init = __init;
window.__seek = __seek;
