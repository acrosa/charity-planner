import { expect, test } from "@playwright/test";

// The happy-path smoke test the deploy gate (RUBRIC.md §1) depends on. The full
// three-persona integration scenarios (S1 Maria, S2 Chens, S3 Sam) land as
// their own specs once the interview + report ship.
test("landing page renders the wordmark and begin CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Charity Planner/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/charity/i);
  await expect(page.getByRole("link", { name: /begin/i })).toBeVisible();
});

test("/api/health returns 200 ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});
