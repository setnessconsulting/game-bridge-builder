import { expect, test } from "@playwright/test";

/**
 * GAME-304: timeout → coaching → untimed retry.
 * Clock-ended rounds show bridges closed + deterministic coaching (never the
 * bare freeze line), and the primary CTA starts a NEW untimed same-skill
 * round without extending the expired clock.
 */

const BANNED = [
  /more time/i,
  /extra time/i,
  /extra seconds?/i,
  /more seconds?/i,
  /\bextend\b/i,
  /extension/i,
  /keep playing/i,
  /don't lose/i,
  /\bhurr(y|ied)\b/i,
  /\bfrozen\b/i,
  /ran out of time/i,
  /\bstreak\b/i,
];

async function expireTimedRound(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.clock.install();
  await page.getByTestId("bridge-start").click();
  await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
  await page.clock.fastForward(90_000);
  await expect(page.getByTestId("bridge-summary")).toBeVisible();
}

test.describe("GAME-304 timeout coaching + untimed retry", () => {
  test("clock end shows coaching summary, never freeze-only copy", async ({ page }) => {
    await expireTimedRound(page);

    await expect(page.getByTestId("bridge-expired")).toContainText("Round over — here's what you built.");
    await expect(page.getByTestId("bridge-expired")).toContainText("The clock reached zero.");
    await expect(page.getByTestId("bridge-bridges-closed")).toContainText("No bridges yet — want another go?");
    await expect(page.getByTestId("bridge-coaching")).not.toBeEmpty();
    await expect(page.getByTestId("bridge-retry-untimed")).toHaveText("Try again — same skill, no timer");
    await expect(page.getByTestId("bridge-retry-timed")).toHaveText("Try the timed challenge");

    const bodyText = await page.locator("body").innerText();
    for (const pattern of BANNED) {
      expect(bodyText).not.toMatch(pattern);
    }
    // No extension affordance smuggled via URL either.
    expect(page.url()).not.toMatch(/roundSeconds|deadline|more-time|extend/i);
  });

  test("primary CTA starts a new untimed same-skill round, not an extension", async ({ page }) => {
    await expireTimedRound(page);
    const skillBefore = await page.getByTestId("bridge-question").getAttribute("data-gap-units");
    expect(skillBefore).not.toBeNull();

    await page.getByTestId("bridge-retry-untimed").click();

    // Fresh untimed round: summary gone, board playable, no clock.
    await expect(page.getByTestId("bridge-summary")).toHaveCount(0);
    await expect(page.getByTestId("bridge-clock")).toHaveText("Relaxed — no timer");
    await expect(page.getByTestId("bridge-open-slot")).toBeEnabled();
    // New round ⇒ fresh puzzle ⇒ fresh piece ids; assert the tray is live.
    await expect(page.getByRole("group", { name: "Piece tray" }).locator("button").first()).toBeEnabled();

    // Same skill family (qualification slice stays bb-compose-10 gaps).
    const gapAfter = Number(await page.getByTestId("bridge-question").getAttribute("data-gap-units"));
    expect(gapAfter).toBeGreaterThan(0);

    // Relaxed round does not expire on the wall clock.
    await page.clock.fastForward(300_000);
    await expect(page.getByTestId("bridge-summary")).toHaveCount(0);
    await expect(page.getByTestId("bridge-clock")).toHaveText("Relaxed — no timer");
  });

  test("secondary CTA returns to the timed challenge without guilt framing", async ({ page }) => {
    await expireTimedRound(page);
    await page.getByTestId("bridge-retry-timed").click();

    await expect(page.getByTestId("bridge-summary")).toHaveCount(0);
    await expect(page.getByTestId("bridge-clock")).toHaveText("90s");
    const bodyText = await page.locator("body").innerText();
    for (const pattern of BANNED) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("setup offers the Relaxed untimed path before the timed challenge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("setup-relaxed")).toBeVisible();
    await page.getByTestId("setup-relaxed").click();
    await expect(page.getByTestId("setup-relaxed")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("bridge-clock")).toHaveText("Relaxed — no timer");
  });
});
