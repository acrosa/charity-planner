import { expect, test } from "@playwright/test";

// Drives the live interview → report flow in a real browser and captures
// screenshots for the QA audit (RUBRIC §3). Mechanical DOM assertions on the
// rendered report; the deep facet/exclusion/allocation checks live in
// scripts/verify-live.ts (HTTP). Slow by nature (LLM turns) — generous timeouts.

const MARIA = [
  "I grew up in Oakland relying on the local food bank, and now that I'm earning well I want to give back to families like mine — food, housing, and helping kids get a fair start.",
  "Mostly hunger and education. Please nothing political.",
  "Around $100 a month, and I'd rather support a handful of places I really believe in than spread it thin.",
];

test("Maria quick interview renders a complete report", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/plan?mode=quick");

  // Wait for the opening question (textarea enabled).
  const input = page.getByLabel("Your answer");
  await expect(input).toBeEnabled({ timeout: 60_000 });

  for (let i = 0; i < MARIA.length; i++) {
    await input.fill(MARIA[i]);
    await page.getByRole("button", { name: /send/i }).click();
    if (i < MARIA.length - 1) {
      // Wait for the agent's next question: input clears + re-enables.
      await expect(input).toHaveValue("", { timeout: 60_000 });
      await expect(input).toBeEnabled({ timeout: 60_000 });
    }
  }

  // The report header appears once recommend resolves.
  const reportHeading = page.getByRole("heading", { name: /a plan made/i });
  await expect(reportHeading).toBeVisible({ timeout: 120_000 });
  // Let the blinds transition retract and paper cards settle.
  await page.waitForTimeout(1500);

  // Sections present (unambiguous locators).
  await expect(page.getByRole("heading", { name: /where it goes/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /your researched shortlist/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /make it real on daffy/i })).toBeVisible();

  // Every charity has a resolvable Daffy link.
  const daffyLinks = page.getByRole("link", { name: /give on daffy/i });
  expect(await daffyLinks.count()).toBeGreaterThanOrEqual(3);
  const firstHref = await daffyLinks.first().getAttribute("href");
  expect(firstHref).toMatch(/daffy\.org\/charities\//);

  // No political-advocacy leakage in the visible report (Maria excluded it).
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("political action");

  await page.screenshot({ path: "qa-test-reports/s1-maria/report-full.png", fullPage: true });
});
