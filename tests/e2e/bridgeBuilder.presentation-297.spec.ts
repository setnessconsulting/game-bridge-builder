import { expect, test, type Page } from "@playwright/test";

/**
 * GAME-297: player-ready presentation sweep on the live candidate.
 * Exercises the state families the ticket lists for the retest — active,
 * underfill, exact-fit, overfill/recovery, honest pause, reduced-motion/mute,
 * and representative phone/desktop layouts — against the DOM mirror the
 * Phaser scene shares state with. Presentation only: math authority untouched.
 */

const DEBUG_COPY = [
  /standalone qualification/i,
  /qualification vertical slice/i,
  /host return handshake/i,
  /early bridge math/i,
  /dot faces/i,
];

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
  await page.getByTestId("bridge-start").click();
  await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
}

test.describe("GAME-297 player-ready presentation", () => {
  test("span and piece states are distinguishable by geometry and glyph, not colour alone", async ({ page }) => {
    await startRound(page);

    // Active / underfill: open dashed slot, remaining-span copy, neutral glyph.
    await expect(page.getByTestId("bridge-open-slot")).toContainText("10 open");
    await expect(page.getByTestId("bridge-state-glyph")).toHaveText("◌");
    await page.getByTestId("piece-plank-4").click();
    await expect(page.getByTestId("bridge-feedback")).toHaveAttribute("data-state", "underfill");
    await expect(page.getByTestId("bridge-span-copy")).toContainText("6 units remain");
    await expect(page.getByTestId("bridge-open-slot")).toContainText("6 open");

    // Exact fit: ink check geometry, celebration ring, parked vehicle.
    await page.getByTestId("piece-plank-6").click();
    await expect(page.getByTestId("bridge-feedback")).toHaveAttribute("data-state", "exact");
    await expect(page.getByTestId("bridge-state-glyph")).toHaveText("✓");
    await expect(page.getByTestId("bridge-celebration")).toBeVisible();
    // Motion on: the car is mid-crossing during the payoff window.
    await expect(page.getByTestId("bridge-vehicle")).toHaveAttribute("data-state", "crossing");

    // Overfill / overhang: warning glyph, splash ring, geometry-based teach copy.
    await startRound(page);
    await page.getByTestId("piece-plank-7").click();
    await page.getByTestId("piece-plank-5").click({ force: true });
    await expect(page.getByTestId("bridge-feedback")).toContainText(/too long for 3 units left/i);
    await expect(page.getByTestId("bridge-state-glyph")).toHaveText("⚠");
    await expect(page.getByTestId("bridge-splash")).toBeVisible();
    await expect(page.getByTestId("bridge-vehicle")).toHaveAttribute("data-state", "falling");
    // Non-colour carriers: an explicit ⚠ teach hint, not just a dimmed colour.
    await expect(page.getByTestId("too-long-plank-5")).toContainText("⚠");
  });

  test("success payoff lands and has reduced-motion and mute equivalents", async ({ page }) => {
    await startRound(page);

    // Motion: the crossing is what carries the payoff.
    await expect(page.getByTestId("bridge-dom-mirror")).toHaveAttribute("data-reduced-motion", "false");
    await page.getByTestId("piece-plank-4").click();
    await page.getByTestId("piece-plank-6").click();
    await expect(page.getByTestId("bridge-celebration")).toBeVisible();

    // Reduced-motion equivalent: same success, static (crossing skipped).
    await page.getByRole("button", { name: "Reduce motion" }).click();
    await expect(page.getByRole("button", { name: "Motion off" })).toBeVisible();
    await expect(page.getByTestId("bridge-dom-mirror")).toHaveAttribute("data-reduced-motion", "true");

    // Mute equivalent is present and operable.
    await page.getByRole("button", { name: "Mute sound" }).click();
    await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();

    // A solve still completes with reduced motion + mute on.
    await startRound(page);
    await page.getByRole("button", { name: "Reduce motion" }).click();
    await page.getByRole("button", { name: "Mute sound" }).click();
    await page.getByTestId("piece-plank-4").click();
    await page.getByTestId("piece-plank-6").click();
    await expect(page.getByTestId("bridge-progress")).toHaveText("Bridge 2 of 6");
  });

  test("honest pause copy and no qualification/debug wording on the player surface", async ({ page }) => {
    await startRound(page);
    await page.getByRole("button", { name: "Pause", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Game paused" });
    await expect(dialog).toBeVisible();
    // Free-site budget present: the clock is stopped, and pausing never adds time.
    await expect(dialog).toContainText("The clock is stopped while this is on screen.");
    await expect(dialog).toContainText("Pausing never adds extra time.");
    await expect(dialog).not.toContainText(/more time|extra seconds/i);
    await page.getByRole("button", { name: "Resume bridge", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const bodyText = await page.locator("body").innerText();
    for (const pattern of DEBUG_COPY) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("stays readable and operable on phone and desktop", async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844, label: "phone" },
      { width: 1280, height: 800, label: "desktop" },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await startRound(page);

      await expect(page.getByTestId("bridge-open-slot")).toBeEnabled();
      await expect(page.getByTestId("bridge-submit")).toBeVisible();
      await expect(page.locator("canvas").first()).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${viewport.label}: no horizontal overflow`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      for (const target of [
        page.getByTestId("bridge-open-slot"),
        page.getByTestId("bridge-submit"),
        page.getByTestId("piece-plank-4"),
      ]) {
        const box = await target.boundingBox();
        expect(box, `${viewport.label}: control has a bounding box`).not.toBeNull();
        if (box) expect(box.height, `${viewport.label}: touch target >= 44px`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
