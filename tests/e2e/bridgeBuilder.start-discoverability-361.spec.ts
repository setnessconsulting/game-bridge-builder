import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * GAME-361: setup/start discoverability.
 *
 * The 2026-09-22 AI playtest observed "Start building" below a 720px fold
 * against 0.1.0-qualification.12. That is a model-coordinate observation, not
 * proof of a human-facing defect, and the candidate has since advanced. These
 * tests lock in the objective part of the answer: on the current build the
 * primary start action is inside the first viewport at 1280x720 in every setup
 * state, the setup never scrolls horizontally, and the action is reachable and
 * operable by keyboard alone with a visible focus ring.
 *
 * What this cannot cover is the human first-time observation GAME-361's
 * acceptance criterion asks for; that gate stays with GAME-172.
 */

const VIEWPORTS = [
  { width: 1280, height: 720, label: "desktop 1280x720" },
  { width: 1366, height: 768, label: "laptop 1366x768" },
  { width: 1280, height: 600, label: "short laptop 1280x600" },
  { width: 820, height: 1180, label: "tablet 820x1180" },
  { width: 390, height: 844, label: "phone 390x844" },
] as const;

/** Setup states: first session shows two CTAs, a returning player one. */
const STATES = [
  { label: "first session", visited: false, primary: "bridge-start-relaxed" },
  { label: "returning player", visited: true, primary: "bridge-start" },
] as const;

async function openSetup(page: Page, viewport: { width: number; height: number }, visited: boolean) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  if (visited) {
    await page.addInitScript(() => sessionStorage.setItem("bb.s0.visited.v1", "1"));
  }
  await page.goto("/");
  await expect(page.getByTestId("bridge-setup")).toBeVisible();
}

async function fullyInFirstViewport(page: Page, locator: Locator, name: string) {
  await expect(locator, `${name} is visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${name} has a bounding box`).not.toBeNull();
  if (!box) return;
  const viewport = page.viewportSize();
  expect(viewport, "viewport is set").not.toBeNull();
  if (!viewport) return;
  expect(box.y, `${name} is not below the fold`).toBeGreaterThanOrEqual(0);
  expect(
    box.y + box.height,
    `${name} is not clipped by the fold (y=${box.y} h=${box.height} vh=${viewport.height})`,
  ).toBeLessThanOrEqual(viewport.height);
}

/**
 * Presses Tab from the top of the document and returns the `data-testid` of
 * each focused setup control, in order. Driven by real key events (not a
 * synthetic focus() call) so the browser's own tab order is what is measured.
 */
async function walkTabOrder(page: Page, steps: number): Promise<string[]> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  const order: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press("Tab");
    const testid = await page
      .evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null)
      .catch(() => null);
    if (!testid) break;
    order.push(testid);
  }
  return order;
}

test.describe("GAME-361 setup/start discoverability", () => {
  for (const viewport of VIEWPORTS) {
    for (const state of STATES) {
      test(`primary start action is in the first viewport at ${viewport.label} (${state.label})`, async ({
        page,
      }) => {
        await openSetup(page, viewport, state.visited);

        // The primary (visually emphasised) start action needs no scrolling.
        await fullyInFirstViewport(page, page.getByTestId(state.primary), state.primary);

        // No horizontal overflow on any target width.
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.body.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scrollWidth,
          `no horizontal overflow (scrollWidth=${overflow.scrollWidth} vw=${overflow.clientWidth})`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);

        // The primary start action itself stays comfortably operable.
        const box = await page.getByTestId(state.primary).boundingBox();
        expect(box, "primary start has a bounding box").not.toBeNull();
        if (box) {
          expect(box.height, "primary start height >= 44px").toBeGreaterThanOrEqual(44);
          expect(box.width, "primary start width >= 44px").toBeGreaterThanOrEqual(44);
        }
      });
    }
  }

  test("a first session shows an in-viewport untimed primary and keeps the timed path", async ({ page }) => {
    await openSetup(page, { width: 1280, height: 720 }, false);

    // GAME-305 framing is intact: the untimed path is the primary, the timed
    // challenge stays one tap away, and both are reachable without scrolling.
    await fullyInFirstViewport(page, page.getByTestId("bridge-start-relaxed"), "bridge-start-relaxed");
    await fullyInFirstViewport(page, page.getByTestId("bridge-start"), "bridge-start");
    await expect(page.getByTestId("bridge-start-relaxed")).toHaveClass(/\bprimary\b/);
    await expect(page.getByTestId("setup-timed-hint")).toBeVisible();
  });

  test("start is reachable and operable by keyboard alone with a visible focus ring", async ({ page }) => {
    await openSetup(page, { width: 1280, height: 720 }, true);

    // Walk the real tab order from the top of the document.
    const order = await walkTabOrder(page, 6);
    expect(order, "primary start is in the tab order").toContain("bridge-start");
    expect(order, "setup controls precede the start action").toContain("setup-numerals");
    expect(order.indexOf("setup-numerals"), "tab order follows the visual order").toBeLessThan(
      order.indexOf("bridge-start"),
    );

    // The primary start paints a visible focus indicator when focused.
    const focusedStyle = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-testid="bridge-start"]');
      el?.focus();
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth),
        boxShadow: cs.boxShadow,
      };
    });
    expect(focusedStyle, "primary start resolves").not.toBeNull();
    const hasOutline = focusedStyle!.outlineStyle !== "none" && focusedStyle!.outlineWidth > 0;
    const hasShadow = focusedStyle!.boxShadow !== "none";
    expect(
      hasOutline || hasShadow,
      `focused primary start shows a visible indicator (outline=${focusedStyle!.outlineStyle}/${focusedStyle!.outlineWidth}, shadow=${focusedStyle!.boxShadow})`,
    ).toBe(true);

    // Keyboard-only activation starts the round.
    await page.locator('[data-testid="bridge-start"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("bridge-setup")).toHaveCount(0);
    await expect(page.getByTestId("bridge-question")).toBeVisible();
  });

  test("setup surface carries no serious automated accessibility violations", async ({ page }) => {
    await openSetup(page, { width: 1280, height: 720 }, false);
    const results = await new (await import("@axe-core/playwright")).default({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
      "no serious/critical axe violations on setup",
    ).toEqual([]);
  });
});
