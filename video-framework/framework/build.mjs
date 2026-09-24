// WCAG Learn video framework — BUILD PIPELINE (framework v1.0.0)
//   Usage: node build.mjs <episode-dir> [--smoke]
//   narration.json → say (per-scene AIFF) → measured schedule → output/*.srt
//   → deterministic frame render (Playwright, 30fps) → ffmpeg → output/*.mp4
//   --smoke: renders every 15th frame and skips assembly (fast QA pass).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";

const EP = path.resolve(process.argv[2] ?? ".");
const SMOKE = process.argv.includes("--smoke");
const FPS = 30;
const LEAD = 0.35;

const spec = JSON.parse(fs.readFileSync(path.join(EP, "narration.json"), "utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(EP, "episode.json"), "utf8"));
const outDir = path.join(EP, "output");
fs.mkdirSync(outDir, { recursive: true });

// ---- 1. narration audio per scene ----
const audioDir = path.join(EP, "audio");
fs.mkdirSync(audioDir, { recursive: true });
const sceneAudio = {};
for (const scene of spec.scenes) {
  if (!scene.cues.length) continue;
  const text = scene.cues.map((c) => c.say).join(" ");
  const aiff = path.join(audioDir, `${scene.id}.aiff`);
  execFileSync("say", ["-v", spec.voice, "-r", String(spec.rate), "-o", aiff, text]);
  const info = execFileSync("afinfo", [aiff], { encoding: "utf8" });
  const dur = parseFloat(info.match(/estimated duration: ([\d.]+)/)[1]);
  sceneAudio[scene.id] = { aiff, dur };
  console.log(`audio ${scene.id}: ${dur.toFixed(2)}s`);
}

// ---- 2. schedule ----
let t = 0;
const scenes = [];
for (const scene of spec.scenes) {
  const start = t;
  let end, cues = [], audioStart = null;
  if (scene.cues.length) {
    const { dur } = sceneAudio[scene.id];
    audioStart = start + LEAD;
    end = audioStart + dur + (scene.tail ?? 0.8);
    const weights = scene.cues.map((c) => c.say.length);
    const total = weights.reduce((a, b) => a + b, 0);
    let ct = audioStart;
    cues = scene.cues.map((c, i) => {
      const d = (weights[i] / total) * dur;
      const cueStart = ct;
      ct += d;
      return { start: cueStart, end: Math.min(ct + 0.15, end), cap: c.cap };
    });
  } else {
    end = start + scene.fixed;
  }
  scenes.push({ id: scene.id, start, end, audioStart, cues });
  t = end;
}
const TOTAL = t;
console.log(`total: ${TOTAL.toFixed(2)}s (framework v1.0.0)`);
fs.writeFileSync(path.join(EP, "schedule.json"), JSON.stringify({ scenes, total: TOTAL }, null, 1));

// ---- 3. captions ----
const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, "0")}`;
};
const allCues = scenes.flatMap((s) => s.cues);
fs.writeFileSync(
  path.join(outDir, `${meta.outfile}.srt`),
  allCues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.cap}\n`).join("\n")
);

// ---- 4. render frames ----
const framesDir = path.join(EP, "frames");
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("file://" + path.join(EP, "scenes.html"));
await page.evaluate(() => document.fonts.ready);
await page.evaluate(({ schedule, m }) => window.__init(schedule, m), { schedule: { scenes }, m: meta });
const frameCount = Math.ceil(TOTAL * FPS);
const step = SMOKE ? 15 : 1;
for (let f = 0; f < frameCount; f += step) {
  await page.evaluate((ms) => window.__seek(ms), (f / FPS) * 1000);
  await page.screenshot({
    path: path.join(framesDir, `f${String(f).padStart(6, "0")}.jpg`),
    type: "jpeg",
    quality: 90
  });
  if (f % 300 === 0) console.log(`frame ${f}/${frameCount}`);
}
await browser.close();
if (SMOKE) { console.log("SMOKE DONE (no assembly)"); process.exit(0); }

// ---- 5. assemble ----
const audioScenes = scenes.filter((s) => s.audioStart != null);
const inputs = [];
const filters = [];
audioScenes.forEach((s, i) => {
  inputs.push("-i", sceneAudio[s.id].aiff);
  filters.push(`[${i + 1}:a]adelay=${Math.round(s.audioStart * 1000)}:all=1[a${i}]`);
});
const mix = audioScenes.map((_, i) => `[a${i}]`).join("");
const filter = `${filters.join(";")};${mix}amix=inputs=${audioScenes.length}:normalize=0[aout]`;
const out = path.join(outDir, `${meta.outfile}.mp4`);
execFileSync(ffmpegPath, [
  "-y",
  "-framerate", String(FPS),
  "-i", path.join(framesDir, "f%06d.jpg"),
  ...inputs,
  "-filter_complex", filter,
  "-map", "0:v", "-map", "[aout]",
  "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k",
  "-t", String(TOTAL),
  out
], { stdio: "inherit" });
console.log("DONE:", out);
