import { expect, type Page, test } from "@playwright/test";

// Scroll the whole page so motion whileInView entrance animations all fire
// (once:true keeps them visible), then return to top for a full-page capture.
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = 350;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}

// Captures the landing page and the S2/S3 reports for the QA audit. Reports are
// generated via /api/recommend then stored via /api/share, so we can screenshot
// the deterministic /r/:slug page without re-driving the slow interview.

const S2_FACETS = {
  causes: ["environment", "science-tech"],
  geo: { raw: "global", scope: "global", state: null, city: null },
  exclusions: { tags: ["religious"], freeText: ["nothing affiliated with Stanford"] },
  budget: { amount: 500, cadence: "monthly" },
  strategy: "broaden_then_focus",
  risk: "experimental",
  change: "systemic",
  outcomes: "wants_evidence",
  horizon: "multi_year",
  discretionaryReserve: true,
  crypto: { mentioned: false, coin: null },
};

const S3_FACETS = {
  causes: ["animals"],
  geo: { raw: null, scope: null, state: null, city: null },
  exclusions: { tags: [], freeText: [] },
  budget: { amount: null, cadence: null },
  strategy: null,
  risk: null,
  change: null,
  outcomes: null,
  horizon: null,
  discretionaryReserve: null,
  crypto: { mentioned: false, coin: null },
};

test("capture landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "qa-test-reports/landing.png", fullPage: true });
});

const S1_FACETS = {
  causes: ["food-nutrition", "education"],
  geo: { raw: "Oakland", scope: "local", state: "CA", city: "Oakland" },
  exclusions: { tags: ["political_advocacy"], freeText: [] },
  budget: { amount: 100, cadence: "monthly" },
  strategy: "concentrate",
  risk: null,
  change: null,
  outcomes: null,
  horizon: null,
  discretionaryReserve: null,
  crypto: { mentioned: false, coin: null },
};

for (const [name, facets, mode] of [
  ["s1-maria", S1_FACETS, "quick"],
  ["s2-chens", S2_FACETS, "full"],
  ["s3-sam", S3_FACETS, "quick"],
] as const) {
  test(`capture ${name} report`, async ({ page, request }) => {
    test.setTimeout(180_000);
    const rec = await request.post("/api/recommend", { data: { facets, mode }, timeout: 170_000 });
    expect(rec.ok()).toBeTruthy();
    const { report } = await rec.json();
    const sh = await request.post("/api/share", { data: { report } });
    expect(sh.ok()).toBeTruthy();
    const { url } = await sh.json();
    await page.goto(url);
    await expect(page.getByRole("heading", { name: /a plan made/i })).toBeVisible({
      timeout: 30_000,
    });
    await scrollThrough(page);
    // Assert the core sections actually rendered (whileInView fired).
    await expect(page.getByRole("heading", { name: /where it goes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /give on daffy/i }).first()).toBeVisible();
    await page.screenshot({ path: `qa-test-reports/${name}/report-full.png`, fullPage: true });
  });
}
