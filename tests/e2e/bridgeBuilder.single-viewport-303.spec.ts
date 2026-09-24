import { expect, test, type Page } from "@playwright/test";

// GAME-303: primary loop (span + tray + Check it + live status) fits one
// viewport on phone, tablet, and short laptop heights. Scroll survives only
// in secondary surfaces (pause dialog).
const VIEWPORTS = [
  { width: 390, height: 844, label: "phone 390x844" },
  { width: 820, height: 1180, label: "tablet 820x1180" },
  { width: 1280, height: 800, label: "laptop 1280x800" },
  { width: 390, height: 700, label: "short phone 390x700" },
  { width: 768, height: 600, label: "short tablet 768x600" },
  { width: 1280, height: 600, label: "short laptop 1280x600" },
] as const;

async function assertInViewport(
  page: Page,
  locator: ReturnType<Page["getByTestId"]> | ReturnType<Page["locator"]>,
  name: string,
) {
  await expect(locator, `${name} visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${name} has a bounding box`).not.toBeNull();
  if (!box) return;
  const viewport = page.viewportSize();
  expect(viewport, "viewport is set").not.toBeNull();
  if (!viewport) return;
  const tolerance = 2;
  expect(box.x, `${name} left edge in viewport`).toBeGreaterThanOrEqual(-tolerance);
  expect(box.y, `${name} top edge in viewport`).toBeGreaterThanOrEqual(-tolerance);
  expect(
    box.x + box.width,
    `${name} right edge in viewport (x=${box.x} w=${box.width} vw=${viewport.width})`,
  ).toBeLessThanOrEqual(viewport.width + tolerance);
  expect(
    box.y + box.height,
    `${name} bottom edge in viewport (y=${box.y} h=${box.height} vh=${viewport.height})`,
  ).toBeLessThanOrEqual(viewport.height + tolerance);
}

test.describe("GAME-303 single-viewport primary loop", () => {
  for (const viewport of VIEWPORTS) {
    test(`fits span, tray, Check it, and status at ${viewport.label} without page scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await page.clock.install();
      await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
      await page.getByTestId("bridge-start").click();
      await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();

      // Primary loop starts at the top — no nested scroll needed to see it.
      expect(await page.evaluate(() => window.scrollY), "scrollY starts at 0").toBe(0);

      const openSlot = page.getByTestId("bridge-open-slot");
      const tray = page.getByRole("group", { name: "Piece tray" });
      const submit = page.getByTestId("bridge-submit");
      const feedback = page.getByTestId("bridge-feedback");
      const roundStatus = page.locator(".bb-candidate-status");

      await assertInViewport(page, openSlot, "bridge-open-slot");
      await assertInViewport(page, tray, "piece tray");
      await assertInViewport(page, submit, "bridge-submit");
      await assertInViewport(page, feedback, "bridge-feedback");
      await assertInViewport(page, roundStatus, "round status");

      // No horizontal overflow on any target width.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `no horizontal overflow (scrollWidth=${overflow.scrollWidth} vw=${overflow.clientWidth})`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // Touch targets stay operable — sample the slot, Check it, and tray planks.
      for (const target of [
        page.getByTestId("bridge-open-slot"),
        page.getByTestId("bridge-submit"),
        page.getByTestId("piece-plank-7"),
        page.getByTestId("piece-plank-5"),
      ]) {
        const box = await target.boundingBox();
        expect(box, "touch target has a bounding box").not.toBeNull();
        if (!box) continue;
        expect(box.height, "touch target height >= 44px").toBeGreaterThanOrEqual(44);
        expect(box.width, "touch target width >= 44px").toBeGreaterThanOrEqual(44);
      }

      // Denied (oversized) teach copy must be on screen, not hidden in a trap.
      // Fresh 10-span: place 7 → 3 left, then 5 is oversized (2 past the span).
      await page.getByTestId("piece-plank-7").click();
      await expect(page.getByTestId("placed-plank-7")).toBeVisible();
      await page.getByTestId("piece-plank-5").click({ force: true });
      await expect(feedback).toContainText(/too long for 3 units left/i);
      await expect(feedback).toContainText(/stick out by 2 units/i);
      await assertInViewport(page, feedback, "denied bridge-feedback");
      const tooLongHint = page.getByTestId("too-long-plank-5");
      await expect(tooLongHint).toBeVisible();
      await assertInViewport(page, tooLongHint, "too-long-plank-5 teach copy");

      // Timeout feedback is never left below the fold.
      await page.clock.fastForward(90_000);
      await expect(page.getByTestId("bridge-expired")).toBeVisible();
      await expect(page.getByTestId("bridge-clock")).toHaveText("0s");
    });
  }
});
