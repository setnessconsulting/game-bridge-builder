import { expect, test, type FrameLocator } from "@playwright/test";

/**
 * GAME-297 AC10: hosted retest state sweep.
 *
 * The existing hosted journey (hosted-games-site.spec.ts) proves the pinned
 * artifact loads, the Phaser surface comes up, and one exact-fit placement
 * works. That is not the breadth AC10 asks for. This spec drives the whole
 * presentation state family through the real hosted iframe so the retest
 * covers active, paused, underfill, exact-fit, overfill, success,
 * reduced-motion/mute and representative phone/desktop compositions.
 *
 * It asserts only observable presentation state in the candidate frame. It
 * never writes to games-site, never promotes a version, and never asserts a
 * production pointer; the pinned version is read from the served play route.
 */

const DEBUG_COPY = [
  /standalone qualification/i,
  /qualification vertical slice/i,
  /host return handshake/i,
  /early bridge math/i,
  /dot faces/i,
];

const VIEWPORTS = [
  { width: 390, height: 844, label: "phone" },
  { width: 1280, height: 800, label: "desktop" },
] as const;

test.describe("GAME-297 hosted retest sweep", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "requires a hosted games-site deployment",
  );

  async function openHostedCandidate(frame: FrameLocator): Promise<void> {
    await expect(frame.getByTestId("bridge-builder-candidate")).toBeVisible();
    await frame.getByTestId("bridge-start").click();
    await expect(frame.getByTestId("bridge-dom-mirror")).toBeVisible();
    await expect(frame.getByTestId("renderer-status")).toHaveText("Canvas ready");
  }

  test("underfill then exact fit with the success payoff in the hosted frame", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/bridge-builder/play/");
    const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
    await openHostedCandidate(frame);

    // Active / underfill: open dashed slot, neutral non-colour glyph, exact remainder.
    await expect(frame.getByTestId("bridge-state-glyph")).toHaveText("\u25CC");
    await expect(frame.getByTestId("bridge-open-slot")).toContainText("10 open");
    await frame.getByTestId("piece-plank-4").click();
    await expect(frame.getByTestId("bridge-feedback")).toHaveAttribute(
      "data-state",
      "underfill",
    );
    await expect(frame.getByTestId("bridge-span-copy")).toContainText(
      "6 units remain",
    );
    await expect(frame.getByTestId("bridge-open-slot")).toContainText("6 open");

    // Exact fit: check glyph, celebration geometry, crossing marker.
    await frame.getByTestId("piece-plank-6").click();
    await expect(frame.getByTestId("bridge-feedback")).toHaveAttribute(
      "data-state",
      "exact",
    );
    await expect(frame.getByTestId("bridge-state-glyph")).toHaveText("\u2713");
    await expect(frame.getByTestId("bridge-celebration")).toBeVisible();
    await expect(frame.getByTestId("bridge-vehicle")).toHaveAttribute(
      "data-state",
      "crossing",
    );

    expect(
      pageErrors,
      "hosted frame raised no uncaught page error during the sweep",
    ).toEqual([]);
  });

  test("overfill warning, splash and teach copy in the hosted frame", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/bridge-builder/play/");
    const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
    await openHostedCandidate(frame);

    await frame.getByTestId("piece-plank-7").click();
    await frame.getByTestId("piece-plank-5").click({ force: true });
    await expect(frame.getByTestId("bridge-feedback")).toContainText(
      /too long for 3 units left/i,
    );
    await expect(frame.getByTestId("bridge-state-glyph")).toHaveText("\u26A0");
    await expect(frame.getByTestId("bridge-splash")).toBeVisible();
    await expect(frame.getByTestId("bridge-vehicle")).toHaveAttribute(
      "data-state",
      "falling",
    );
    await expect(frame.getByTestId("too-long-plank-5")).toContainText("\u26A0");

    expect(pageErrors).toEqual([]);
  });

  test("honest pause copy and no qualification wording on the hosted player surface", async ({
    page,
  }) => {
    await page.goto("/bridge-builder/play/");
    const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
    await openHostedCandidate(frame);

    await frame.getByRole("button", { name: "Pause", exact: true }).click();
    const dialog = frame.getByRole("dialog", { name: "Game paused" });
    await expect(dialog).toBeVisible();
    // Free-site budget: the clock is stopped, and pausing never grants time.
    await expect(dialog).toContainText(
      "The clock is stopped while this is on screen.",
    );
    await expect(dialog).toContainText("Pausing never adds extra time.");
    await expect(dialog).not.toContainText(/more time|extra seconds/i);
    await frame.getByRole("button", { name: "Resume bridge", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    // AC6: internal qualification wording must not reach the hosted player surface.
    const bodyText = await frame.locator("body").innerText();
    for (const pattern of DEBUG_COPY) {
      expect(bodyText, `player surface free of ${pattern}`).not.toMatch(pattern);
    }
  });

  test("reduced-motion and mute equivalents are present and operable hosted", async ({
    page,
  }) => {
    await page.goto("/bridge-builder/play/");
    const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
    await openHostedCandidate(frame);

    await expect(frame.getByTestId("bridge-dom-mirror")).toHaveAttribute(
      "data-reduced-motion",
      "false",
    );

    await frame.getByRole("button", { name: "Reduce motion" }).click();
    await expect(frame.getByRole("button", { name: "Motion off" })).toBeVisible();
    await expect(frame.getByTestId("bridge-dom-mirror")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );

    await frame.getByRole("button", { name: "Mute sound" }).click();
    await expect(frame.getByRole("button", { name: "Sound off" })).toBeVisible();

    // A solve still completes with reduced motion and mute on (AC5): the
    // celebration geometry stays, and the crossing is replaced by the parked
    // marker because the crossing tween is the motion being reduced.
    await frame.getByTestId("piece-plank-4").click();
    await frame.getByTestId("piece-plank-6").click();
    await expect(frame.getByTestId("bridge-celebration")).toBeVisible();
    await expect(frame.getByTestId("bridge-dom-mirror")).toHaveAttribute(
      "data-crossing",
      "false",
    );
    await expect(frame.getByTestId("bridge-vehicle")).toHaveAttribute(
      "data-state",
      "parked",
    );
  });

  for (const viewport of VIEWPORTS) {
    test(`stays readable and operable at ${viewport.label} in the hosted frame`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/bridge-builder/play/");
      const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
      await openHostedCandidate(frame);

      await expect(frame.getByTestId("bridge-open-slot")).toBeVisible();
      await expect(frame.getByTestId("bridge-submit")).toBeVisible();
      await expect(frame.locator("canvas").first()).toBeVisible();

      const overflow = await frame
        .locator("body")
        .evaluate((body) => ({
          scrollWidth: body.scrollWidth,
          clientWidth: body.ownerDocument.documentElement.clientWidth,
        }));
      expect(
        overflow.scrollWidth,
        `${viewport.label}: no horizontal overflow`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      for (const target of [
        frame.getByTestId("bridge-open-slot"),
        frame.getByTestId("bridge-submit"),
        frame.getByTestId("piece-plank-4"),
      ]) {
        const box = await target.boundingBox();
        expect(box, `${viewport.label}: control has a bounding box`).not.toBeNull();
        if (box) {
          expect(
            box.height,
            `${viewport.label}: touch target >= 44px`,
          ).toBeGreaterThanOrEqual(44);
        }
      }
    });
  }
});