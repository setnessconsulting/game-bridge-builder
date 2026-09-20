import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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

async function solveCurrentQuestion(page: import("@playwright/test").Page): Promise<void> {
  const target = Number(await page.getByTestId("bridge-question").getAttribute("data-gap-units"));
  const pieces = await page
    .getByRole("group", { name: "Piece tray" })
    .locator("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => ({
        id: (button as HTMLButtonElement).dataset.pieceId ?? "",
        units: Number((button as HTMLButtonElement).dataset.units),
      })),
    );

  for (const id of exactSolution(pieces, target)) {
    await page.locator(`[data-piece-id="${id}"]`).click();
  }
}

test.describe("Bridge Builder qualification vertical slice", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
    await expect(page.getByTestId("bridge-setup")).toBeVisible();
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
  });

  test("runs the real Phaser canvas and DOM mirror together", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible();
    // DOM fallback remains usable, but cannot count as real-render evidence.
    await expect(page.getByTestId("renderer-status")).toHaveText("Canvas ready");
    await expect(page.getByTestId("phaser-render-status")).toHaveText(
      "Phaser rendering surface ready.",
    );
    const canvasPixels = await page.locator("canvas").first().evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      return { width: canvas.width, height: canvas.height, context: Boolean(context) };
    });
    expect(canvasPixels.width).toBeGreaterThan(0);
    expect(canvasPixels.height).toBeGreaterThan(0);
    expect(canvasPixels.context).toBe(true);
  });

  test("setup defaults to numerals and offers a dot display", async ({ page }) => {
    await page.reload();
    await expect(page.getByTestId("setup-numerals")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("setup-dots")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("setup-dots").click();
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("piece-plank-4").getByTestId("dot-face")).toBeVisible();
    await expect(page.getByTestId("piece-plank-4")).toHaveAttribute("aria-label", "4 units plank");
  });

  test("player surface hides qualification language and exposes visual state", async ({ page }) => {
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("Standalone qualification");
    expect(bodyText).not.toContain("Qualification vertical slice");
    expect(bodyText).not.toContain("Early bridge math");
    expect(bodyText).not.toContain("host return handshake");

    await page.getByTestId("piece-plank-4").click();
    await expect(page.getByTestId("placed-plank-4")).toBeVisible();
    await expect(page.getByTestId("bridge-dom-mirror")).toHaveAttribute("data-verdict", "underfill");
    await expect(page.getByTestId("bridge-builder-candidate")).toHaveAttribute("data-responsive", /^(tablet|desktop)$/);
  });

  test("pause uses honest player copy and freezes the Phaser surface", async ({ page }) => {
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Paused — the clock is waiting." })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Game paused" })).toContainText("Up to 60 seconds of pause.");
    await expect(page.getByTestId("bridge-phaser-canvas-host")).toHaveAttribute("data-paused", "true");
    await page.getByRole("button", { name: "Resume bridge", exact: true }).click();
    await expect(page.getByTestId("bridge-phaser-canvas-host")).toHaveAttribute("data-paused", "false");
  });

  test("keeps the board readable on a phone-sized viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("bridge-start").click();
    await expect(page.getByText("Canvas ready", { exact: true })).toBeVisible();
    await expect(page.getByTestId("bridge-builder-candidate")).toHaveAttribute("data-responsive", "phone");
    const dimensions = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      canvasWidth: document.querySelector("[data-testid=bridge-phaser-canvas-host]")?.getBoundingClientRect().width ?? 0,
    }));
    expect(dimensions.bodyWidth).toBe(dimensions.viewportWidth);
    expect(dimensions.canvasWidth).toBeGreaterThanOrEqual(280);
    await expect(page.getByTestId("bridge-open-slot")).toHaveJSProperty("disabled", false);
  });

  test("supports underfill, submit, retry, and undo", async ({ page }) => {
    await page.getByTestId("piece-plank-4").click();
    await expect(page.getByTestId("placed-plank-4")).toBeVisible();
    await expect(page.getByTestId("bridge-feedback")).toContainText("6 units remain");

    await page.getByTestId("bridge-submit").click();
    await expect(page.getByTestId("bridge-vehicle")).toHaveAttribute("data-state", "stuck");
    await expect(page.getByTestId("bridge-feedback")).toContainText("Still short by 6 units");
    await page.getByTestId("bridge-retry").click();
    await page.getByTestId("bridge-undo").click();
    await expect(page.getByTestId("bridge-open-slot")).toContainText("10 open");
  });

  test("shows recoverable overfill feedback", async ({ page }) => {
    await page.getByTestId("piece-plank-7").click();
    await expect(page.getByTestId("placed-plank-7")).toBeVisible();
    await page.getByTestId("piece-plank-5").click();
    await expect(page.getByTestId("bridge-vehicle")).toHaveAttribute("data-state", "falling");
    await expect(page.getByTestId("bridge-feedback")).toContainText("Too long by 2 units");
    await expect(page.getByTestId("bridge-reset")).toBeEnabled();
  });

  test("reset changes the puzzle state but cannot extend the engine deadline", async ({ page }) => {
    await page.reload();
    await page.clock.install();
    await page.getByTestId("bridge-start").click();
    await page.clock.fastForward(15_000);
    const clock = page.getByTestId("bridge-clock");
    await expect(clock).toHaveText("75s");
    const remainingBeforeReset = Number((await clock.textContent())?.replace(/\D/g, ""));
    await page.getByTestId("bridge-reset").click();
    await page.clock.fastForward(5_000);
    const remainingAfterReset = Number((await clock.textContent())?.replace(/\D/g, ""));
    expect(remainingAfterReset).toBeLessThanOrEqual(remainingBeforeReset - 5);
  });

  test("query and DOM clock edits cannot revive an expired round", async ({ page }) => {
    await page.goto("/?roundSeconds=999&deadline=never");
    await page.clock.install();
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("bridge-clock")).toHaveText("90s");
    await page.evaluate(() => {
      const clockLabel = document.querySelector('[data-testid="bridge-clock"]');
      if (clockLabel) clockLabel.textContent = "999s";
    });
    await page.clock.fastForward(90_000);
    await expect(page.getByTestId("bridge-expired")).toBeVisible();
    await expect(page.getByTestId("bridge-clock")).toHaveText("0s");
    await expect(page.getByTestId("piece-plank-4")).toBeDisabled();
    await expect(page.getByTestId("bridge-reset")).toBeDisabled();
  });

  test("supports keyboard selection, placement, undo, and announcement replay", async ({ page }) => {
    const piece = page.getByTestId("piece-plank-4");
    await piece.focus();
    await piece.press("Enter");
    await expect(piece).toHaveAttribute("aria-pressed", "true");

    const openSlot = page.getByTestId("bridge-open-slot");
    await openSlot.focus();
    await openSlot.press("Enter");
    await expect(page.getByTestId("placed-plank-4")).toBeVisible();

    await page.getByTestId("bridge-builder-candidate").press("u");
    await expect(page.getByTestId("placed-plank-4")).toHaveCount(0);
    await page.getByTestId("bridge-builder-candidate").press("r");
    await expect(page.getByTestId("bridge-feedback")).toContainText("Choose a plank");
  });

  test("supports drag placement, reduced motion, mute, and touch-sized controls", async ({ page }) => {
    await page.getByTestId("piece-plank-4").dragTo(page.getByTestId("bridge-open-slot"));
    await expect(page.getByTestId("placed-plank-4")).toBeVisible();

    await page.getByRole("button", { name: "Reduce motion" }).click();
    await expect(page.getByRole("button", { name: "Motion off" })).toBeVisible();
    await page.getByRole("button", { name: "Mute sound" }).click();
    await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();

    const height = await page.getByTestId("bridge-open-slot").evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(48);
  });

  test("keeps the DOM mirror free of serious automated accessibility violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include("[data-testid=bridge-dom-mirror]")
      .analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });

  test("advances through six distinct questions without repeating the same one consecutively", async ({ page }) => {
    let previousGap = Number(await page.getByTestId("bridge-question").getAttribute("data-gap-units"));

    for (let bridgeNumber = 1; bridgeNumber <= 6; bridgeNumber += 1) {
      await expect(page.getByTestId("bridge-progress")).toHaveText(`Bridge ${bridgeNumber} of 6`);
      const puzzleId = await page.getByTestId("bridge-question").getAttribute("data-puzzle-id");
      await solveCurrentQuestion(page);

      if (bridgeNumber < 6) {
        await expect(page.getByTestId("bridge-progress")).toHaveText(`Bridge ${bridgeNumber + 1} of 6`);
        const question = page.getByTestId("bridge-question");
        await expect(question).not.toHaveAttribute("data-puzzle-id", puzzleId ?? "");
        const nextGap = Number(await question.getAttribute("data-gap-units"));
        expect(nextGap).not.toBe(previousGap);
        previousGap = nextGap;
        await expect(page.getByTestId("bridge-summary")).toHaveCount(0);
      }
    }

    await expect(page.getByTestId("bridge-summary")).toContainText("You solved 6 bridges");
    await expect(page.getByTestId("bridge-summary")).toContainText(/\d+ points/);
  });
});
