// Full-app axe-core scan. Drives the app into every distinct UI state
// (three viewports: desktop, mobile portrait, phone landscape) and runs
// axe against each; exits non-zero if any state has a violation, so CI
// fails the deploy check. The /feedback success state is produced by
// intercepting the network route — no submission is ever sent.
//
//   BASE=https://wcaglearn.com node scripts/axe-scan.mjs   (default)
//   BASE=http://localhost:3000 node scripts/axe-scan.mjs   (local)
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "https://wcaglearn.com";

const clickText = async (page, selector, text) => {
  await page.locator(selector, { hasText: text }).first().click();
};

const startGuide = async (page) => {
  await page.goto(BASE + "/");
  await clickText(page, "button", "Start Reference Guide");
  await page.waitForSelector(".reference-topbar");
};

const startQuiz = async (page) => {
  await page.goto(BASE + "/");
  await clickText(page, "button", "Start Quiz");
  await page.waitForSelector(".quiz-option");
};

const answerCorrectly = async (page) => {
  for (let i = 0; i < 6; i++) {
    if ((await page.locator(".quiz-option.correct").count()) > 0) break;
    const fresh = page.locator(
      ".quiz-option:not([disabled]):not(.wrong):not(.correct)"
    );
    if ((await fresh.count()) === 0) break;
    const pick = await fresh.nth(0).elementHandle();
    await pick.click();
    // Wait for the app to mark THIS pick (correct or wrong) before moving
    // on — clicking again mid-render re-selects and scrambles the round.
    await page
      .waitForFunction(
        (el) =>
          el.classList.contains("correct") || el.classList.contains("wrong"),
        pick,
        { timeout: 4000 }
      )
      .catch(() => {});
  }
  await page.waitForSelector(".quiz-option.correct", { timeout: 8000 });
};

// Summary is reached by planting a finished round (the same payload shape
// the app saves) from /about, where the app isn't mounted to overwrite it.
const plantSummarySession = async (page) => {
  await page.goto(BASE + "/about");
  await page.evaluate(() => {
    localStorage.setItem("wcag-learn:view-mode", "quiz");
    localStorage.setItem(
      "wcag-learn:session:v1",
      JSON.stringify({
        started: true,
        activeIndex: 0,
        activeId: "1.1.1",
        tagFilter: null,
        quiz: {
          round: [
            { id: "1.1.1", type: "idToTitle", ftc: true },
            { id: "1.3.5", type: "level", ftc: false },
            { id: "2.1.1", type: "principle", ftc: true }
          ],
          index: 2,
          phase: "summary",
          principleFilter: "All",
          levelFilter: "All"
        }
      })
    );
  });
  await page.goto(BASE + "/");
  await page.waitForSelector(".quiz-summary");
};

const desktop = { width: 1280, height: 900 };
const phone = { width: 375, height: 812 };
const landscape = { width: 844, height: 390 };

const states = [
  {
    name: "Start screen",
    vp: desktop,
    setup: async (p) => {
      await p.goto(BASE + "/");
      await p.waitForSelector("button");
    }
  },
  {
    name: "Guide — criterion card (desktop, sidebar visible)",
    vp: desktop,
    setup: startGuide
  },
  {
    name: "Guide — tag filter active",
    vp: desktop,
    setup: async (p) => {
      await startGuide(p);
      await p.locator(".details-tech-chip").first().click();
      await p.waitForSelector(".tag-filter-chip");
    }
  },
  {
    name: "Guide — expanded image overlay",
    vp: desktop,
    setup: async (p) => {
      await startGuide(p);
      await p.locator(".reference-image-trigger").click();
      await p.waitForSelector(".example-overlay");
    }
  },
  { name: "Quiz — question", vp: desktop, setup: startQuiz },
  {
    name: "Quiz — correct state (verdict banner + Next)",
    vp: desktop,
    setup: async (p) => {
      await startQuiz(p);
      await answerCorrectly(p);
    }
  },
  { name: "Quiz — round summary", vp: desktop, setup: plantSummarySession },
  {
    name: "Feedback — default",
    vp: desktop,
    setup: async (p) => {
      await p.goto(BASE + "/feedback");
      await p.waitForSelector(".feedback-form");
    }
  },
  {
    name: "Feedback — error state",
    vp: desktop,
    setup: async (p) => {
      await p.goto(BASE + "/feedback");
      await p.locator(".feedback-submit").click();
      await p.waitForSelector("#feedback-message-error");
    }
  },
  {
    name: "Feedback — success state (route-stubbed, nothing submitted)",
    vp: desktop,
    setup: async (p) => {
      await p.route("**/api/feedback", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true })
        })
      );
      await p.goto(BASE + "/feedback");
      await p.locator("#feedback-message").fill("axe scan — never submitted");
      await p.locator(".feedback-submit").click();
      await p.waitForSelector(".feedback-success");
    }
  },
  {
    name: "Accessibility statement — with barrier form",
    vp: desktop,
    setup: async (p) => {
      await p.goto(BASE + "/accessibility");
      await p.waitForSelector(".feedback-form");
    }
  },
  {
    name: "Accessibility statement — form error state",
    vp: desktop,
    setup: async (p) => {
      await p.goto(BASE + "/accessibility");
      await p.locator(".feedback-submit").click();
      await p.waitForSelector("#feedback-message-error");
    }
  },
  {
    name: "About page",
    vp: desktop,
    setup: async (p) => {
      await p.goto(BASE + "/about");
      await p.waitForSelector(".about-title");
    }
  },
  {
    name: "Guide — mobile portrait, drawer open",
    vp: phone,
    setup: async (p) => {
      await startGuide(p);
      await p.locator(".sidebar-toggle").click();
      await p.waitForSelector(".learn-sidebar.open");
      await p.waitForTimeout(350);
    }
  },
  {
    name: "Guide — mobile portrait, card + pinned arrows",
    vp: phone,
    setup: startGuide
  },
  { name: "Quiz — phone landscape (two-column)", vp: landscape, setup: startQuiz }
];

const browser = await chromium.launch();
const results = [];
let failed = 0;

for (const state of states) {
  const ctx = await browser.newContext({ viewport: state.vp });
  const page = await ctx.newPage();
  try {
    await state.setup(page);
    await page.waitForTimeout(300);
    const axe = await new AxeBuilder({ page }).analyze();
    if (axe.violations.length > 0) failed++;
    results.push({
      state: state.name,
      viewport: `${state.vp.width}x${state.vp.height}`,
      violations: axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5)
      })),
      incomplete: axe.incomplete.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 3)
      }))
    });
    console.log(
      `${axe.violations.length ? "FAIL" : "OK  "} ${state.name} — ${axe.violations.length} violations, ${axe.incomplete.length} incomplete`
    );
  } catch (e) {
    // A state that can't be reached is a failure too — it means the scan
    // silently stopped covering part of the app.
    failed++;
    results.push({ state: state.name, error: String(e).slice(0, 300) });
    console.log(`ERR  ${state.name} — ${String(e).slice(0, 160)}`);
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync("axe-results.json", JSON.stringify(results, null, 2));
const totalV = results.reduce((s, r) => s + (r.violations?.length ?? 0), 0);
console.log(
  `\n${failed ? "FAILED" : "PASSED"} — ${results.length} states, ${totalV} violations, ${failed} failing states. Detail: axe-results.json`
);
process.exitCode = failed ? 1 : 0;
