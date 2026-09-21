import { expect, test, type Page } from "@playwright/test";

/**
 * GAME-306: second-construction / alternate-fill offer.
 * Solves 1–2 show no card; the 3rd eligible solve shows a non-modal inline
 * card that Accept rebuilds the same gap (+engine bonus), Decline/Esc/5s
 * dismiss warm, and the next bridge still advances on its normal schedule.
 */

interface TrayPiece {
  id: string;
  units: number;
}

function exactSolution(pieces: TrayPiece[], target: number): string[] {
  for (let mask = 1; mask < 1 << pieces.length; mask += 1) {
    let total = 0;
    const ids: string[] = [];
    for (let index = 0; index < pieces.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      total += pieces[index]!.units;
      ids.push(pieces[index]!.id);
    }
    if (total === target) return ids;
  }
  throw new Error(`No exact solution found for target ${target}`);
}

async function pieceTray(page: Page): Promise<TrayPiece[]> {
  return page
    .getByRole("group", { name: "Piece tray" })
    .locator("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => ({
        id: (button as HTMLButtonElement).dataset.pieceId ?? "",
        units: Number((button as HTMLButtonElement).dataset.units),
      })),
    );
}

/** Place one exact-fit solution on the current puzzle. */
async function solveCurrentBridge(page: Page): Promise<{ puzzleId: string; gap: number }> {
  const question = page.getByTestId("bridge-question");
  const puzzleId = (await question.getAttribute("data-puzzle-id")) ?? "";
  const gap = Number(await question.getAttribute("data-gap-units"));
  const pieces = await pieceTray(page);
  for (const id of exactSolution(pieces, gap)) {
    await page.locator(`[data-piece-id="${id}"]`).click();
  }
  return { puzzleId, gap };
}

async function readScore(page: Page): Promise<number> {
  const text = await page.locator(".bb-candidate-status").innerText();
  const match = text.match(/(\d+)\s*points/);
  return match ? Number(match[1]) : NaN;
}

/** Reach the offer: solve bridges 1 and 2 (no card), then the 3rd eligible solve. */
async function reachThirdSolveOffer(page: Page): Promise<{ offeredId: string; gap: number }> {
  await page.goto("/");
  await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
  await page.getByTestId("bridge-start").click();
  await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();

  await solveCurrentBridge(page);
  await expect(page.getByTestId("bridge-progress")).toHaveText("Bridge 2 of 6");
  await expect(page.getByTestId("second-build-offer")).toHaveCount(0);

  await solveCurrentBridge(page);
  await expect(page.getByTestId("bridge-progress")).toHaveText("Bridge 3 of 6");
  await expect(page.getByTestId("second-build-offer")).toHaveCount(0);

  const { puzzleId: offeredId, gap } = await solveCurrentBridge(page);
  await expect(page.getByTestId("second-build-offer")).toBeVisible();
  return { offeredId, gap };
}

test.describe("GAME-306 second-construction offer", () => {
  test("no card on the first two solves, non-modal card on the third eligible solve", async ({ page }) => {
    const { offeredId } = await reachThirdSolveOffer(page);

    const offer = page.getByTestId("second-build-offer");
    // Non-modal inline status surface: never a dialog, never aria-modal.
    await expect(offer).toHaveAttribute("role", "status");
    await expect(offer).not.toHaveAttribute("aria-modal", /.*/);
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    // The offer is anchored to the puzzle that was just solved.
    await expect(offer).toHaveAttribute("data-puzzle-id", offeredId);
    await expect(page.getByTestId("second-build-offer-title")).toContainText("Build it another way?");
    await expect(page.getByTestId("second-build-offer-copy")).toContainText("Any exact fit counts");

    // Non-blocking: the next bridge is already playable while the card is up.
    await expect(page.getByTestId("bridge-open-slot")).toBeEnabled();
  });

  test("Accept rebuilds the same gap and scores the second-build bonus", async ({ page }) => {
    const { offeredId, gap } = await reachThirdSolveOffer(page);
    const scoreBefore = await readScore(page);

    await page.getByTestId("second-build-accept").click();
    await expect(page.getByTestId("second-build-offer")).toHaveCount(0);
    // Same gap, fresh board, same puzzle.
    await expect(page.getByTestId("bridge-question")).toHaveAttribute("data-puzzle-id", offeredId);
    await expect(page.getByTestId("bridge-question")).toHaveAttribute("data-gap-units", String(gap));
    await expect(page.locator('[data-testid^="placed-"]')).toHaveCount(0);

    await solveCurrentBridge(page);
    // Second-build tier: +5 engine base (plus at most a streak bonus), never a
    // first-build 10+ award.
    const delta = (await readScore(page)) - scoreBefore;
    expect(delta).toBeGreaterThanOrEqual(5);
    expect(delta).toBeLessThan(10);
  });

  test("Decline and Escape dismiss warmly and the next bridge still advances", async ({ page }) => {
    await reachThirdSolveOffer(page);
    await page.getByTestId("second-build-decline").click();
    await expect(page.getByTestId("second-build-offer")).toHaveCount(0);
    // The crossing schedule still carried us to bridge 4 — no skipped or stuck puzzle.
    await expect(page.getByTestId("bridge-progress")).toHaveText("Bridge 4 of 6");
    await expect(page.getByTestId("bridge-open-slot")).toBeEnabled();

    // Escape takes the same warm dismissal path on a fresh offer.
    await page.goto("/");
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
    await solveCurrentBridge(page);
    await expect(page.getByTestId("bridge-progress")).toHaveText("Bridge 2 of 6");
    await solveCurrentBridge(page);
    await expect(page.getByTestId("bridge-progress")).toHaveText("Bridge 3 of 6");
    await solveCurrentBridge(page);
    await expect(page.getByTestId("second-build-offer")).toBeVisible();
    await page.getByTestId("bridge-builder-candidate").press("Escape");
    await expect(page.getByTestId("second-build-offer")).toHaveCount(0);
  });

  test("the 5 s card lifetime auto-dismisses without blocking the next bridge", async ({ page }) => {
    const { offeredId } = await reachThirdSolveOffer(page);
    const offer = page.getByTestId("second-build-offer");
    // A lifetime, not a gate: still present shortly after, then gone on its own.
    await expect(offer).toBeVisible();
    await expect(offer).toHaveAttribute("data-puzzle-id", offeredId);
    await expect(offer).toHaveCount(0, { timeout: 9_000 });
    await expect(page.getByTestId("bridge-open-slot")).toBeEnabled();
  });
});
