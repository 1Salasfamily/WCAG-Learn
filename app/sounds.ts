// Quiz feedback earcons ("marimba tap"), synthesized on demand — no audio
// assets, no network. Sounds only ever play from the user's own answer
// activation (tap or digit key), run well under the 3-second threshold where
// WCAG 1.4.2 Audio Control applies, and supplement the visual state and
// live-region announcements rather than replace them. Audio failure of any
// kind must never break answering, so everything no-ops on error.

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    if (!ctx) {
      // Safari < 14.1 exposes only the webkit-prefixed constructor.
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // iOS creates contexts suspended until a user gesture; both play
    // functions are called from one, so resuming here is allowed.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// One struck note: fast attack, exponential decay.
function note(
  c: AudioContext,
  t0: number,
  freq: number,
  dur: number,
  peak: number,
  type: OscillatorType = "sine"
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Correct: a single warm struck note with an octave shimmer.
export function playCorrectSound() {
  try {
    const c = audioContext();
    if (!c) return;
    const t = c.currentTime;
    note(c, t, 880, 0.18, 0.12);
    note(c, t, 1760, 0.1, 0.045);
  } catch {
    // Sound is a bonus channel — never let it interfere with answering.
  }
}

// Wrong: two soft descending taps (D4 → B3) — gentle, not a buzzer.
export function playWrongSound() {
  try {
    const c = audioContext();
    if (!c) return;
    const t = c.currentTime;
    note(c, t, 294, 0.1, 0.09, "triangle");
    note(c, t + 0.11, 247, 0.14, 0.09, "triangle");
  } catch {
    // Sound is a bonus channel — never let it interfere with answering.
  }
}
