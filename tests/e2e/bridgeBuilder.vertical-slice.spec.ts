import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Bridge Builder qualification vertical slice", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
    await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
  });

  test("runs the real Phaser canvas and DOM mirror together", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByTestId("renderer-status")).toHaveText(/Canvas ready|DOM view active/);
    const canvasPixels = await page.locator("canvas").first().evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      return { width: canvas.width, height: canvas.height, context: Boolean(context) };
    });
    expect(canvasPixels.width).toBeGreaterThan(0);
    expect(canvasPixels.height).toBeGreaterThan(0);
    expect(canvasPixels.context).toBe(true);
  });

  test("supports underfill, submit, retry, and undo", async ({ page }) => {
    await page.getByTestId("piece-plank-4").click();
    await page.getByTestId("bridge-open-slot").click();
    await expect(page.getByTestId("bridge-feedback")).toContainText("6 units remain");

    await page.getByTestId("bridge-submit").click();
    await expect(page.getByTestId("bridge-feedback")).toContainText("Still short by 6 units");
    await page.getByTestId("bridge-retry").click();
    await page.getByTestId("bridge-undo").click();
    await expect(page.getByTestId("bridge-open-slot")).toContainText("10 open");
  });

  test("shows recoverable overfill feedback", async ({ page }) => {
    await page.getByTestId("piece-plank-7").click();
    await page.getByTestId("bridge-open-slot").click();
    await page.getByTestId("piece-plank-5").click();
    await page.getByTestId("bridge-open-slot").click();
    await expect(page.getByTestId("bridge-feedback")).toContainText("Too long by 2 units");
    await expect(page.getByTestId("bridge-reset")).toBeEnabled();
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

  test("completes the exact journey and summary", async ({ page }) => {
    await page.getByTestId("piece-plank-4").click();
    await page.getByTestId("bridge-open-slot").click();
    await page.getByTestId("piece-plank-6").click();
    await page.getByTestId("bridge-open-slot").click();
    await expect(page.getByTestId("bridge-feedback")).toContainText("Exact fit");
    await expect(page.getByTestId("bridge-summary")).toContainText("You made an exact fit");
    await expect(page.getByTestId("bridge-summary")).toContainText("12 points");
  });
});
