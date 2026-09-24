import { expect, test } from "@playwright/test";

/**
 * GAME-305: first-session untimed-first (Relaxed build) onboarding.
 * A new player is led to the no-clock path with a nearly unfailable teaching
 * round; the timed challenge stays one tap away. Relaxed is free-site only and
 * the retired Workshop / Sandbox names never surface in player copy.
 */

const RETIRED = [/workshop/i, /sandbox/i, /free-build/i];

test.describe("GAME-305 untimed-first onboarding", () => {
  test("first visit leads with the untimed path and keeps the timed challenge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
    await expect(page.getByTestId("setup-lead")).toContainText("no timer");
    await expect(page.getByTestId("setup-relaxed")).toBeVisible();
    await expect(page.getByTestId("setup-timed-hint")).toContainText("timed challenge");

    // Untimed-first primary starts a Relaxed round with no clock.
    await page.getByTestId("bridge-start-relaxed").click();
    await expect(page.getByTestId("bridge-clock")).toHaveText("Relaxed — no timer");
    await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
  });

  test("first-session untimed round opens with the nearly unfailable teaching puzzle", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("bridge-start-relaxed").click();

    const question = page.getByTestId("bridge-question");
    await expect(question).toHaveAttribute("data-gap-units", "5");
    for (const id of ["plank-2", "plank-3", "plank-8"]) {
      await expect(page.getByTestId(`piece-${id}`)).toBeVisible();
    }

    // Every legal move is progress: 2 then 3 closes the span exactly.
    await page.getByTestId("piece-plank-2").click();
    await page.getByTestId("piece-plank-3").click();
    await expect(page.getByTestId("placed-plank-2")).toBeVisible();
    await expect(page.getByTestId("placed-plank-3")).toBeVisible();
    await expect(page.getByTestId("bridge-feedback")).toContainText("Exact fit");
  });

  test("timed challenge still works when selected", async ({ page }) => {
    await page.goto("/");
    // First session: the secondary start runs the timed qualification slice.
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("bridge-clock")).toHaveText("90s");
    await expect(page.getByTestId("bridge-question")).toHaveAttribute("data-gap-units", "10");
  });

  test("never surfaces the retired Workshop / Sandbox / free-build names", async ({ page }) => {
    await page.goto("/");
    const setupText = await page.getByTestId("bridge-setup").innerText();
    for (const pattern of RETIRED) {
      expect(setupText).not.toMatch(pattern);
    }

    await page.getByTestId("bridge-start-relaxed").click();
    await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
    const playText = await page.locator("body").innerText();
    for (const pattern of RETIRED) {
      expect(playText).not.toMatch(pattern);
    }
  });

  test("Relaxed has no earned-break entry (free-site containment)", async ({ page }) => {
    // A would-be break entry must not expose a break host or a Relaxed path.
    await page.goto("/?mode=break&break=1");
    await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
    await expect(page.locator('[data-testid="break-countdown"], [data-testid="break-host"]')).toHaveCount(0);
    // Still the free-site setup, where Relaxed is legitimately available.
    await expect(page.getByTestId("setup-relaxed")).toBeVisible();
  });
});
