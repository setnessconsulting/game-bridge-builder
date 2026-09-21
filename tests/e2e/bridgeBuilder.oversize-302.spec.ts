import { expect, test } from "@playwright/test";

test.describe("GAME-302 oversized tray planks teach", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("bridge-builder-candidate")).toBeVisible();
    await page.getByTestId("bridge-start").click();
    await expect(page.getByTestId("bridge-dom-mirror")).toBeVisible();
  });

  test("dims oversized planks with teach copy before commit", async ({ page }) => {
    // Fresh 10-span: nothing oversized yet.
    await expect(page.getByTestId("piece-plank-7")).toHaveAttribute("data-oversized", "false");

    // Place 7 → 3 left. 4/5/6 now exceed the remaining span.
    await page.getByTestId("piece-plank-7").click();
    await expect(page.getByTestId("placed-plank-7")).toBeVisible();
    await expect(page.getByTestId("bridge-open-slot")).toContainText("3 open");

    const tooLong5 = page.getByTestId("too-long-plank-5");
    await expect(page.getByTestId("piece-plank-5")).toHaveAttribute("data-oversized", "true");
    await expect(page.getByTestId("piece-plank-5")).toHaveAttribute("aria-disabled", "true");
    // GAME-302: aria-disabled keeps the control focusable/clickable so the
    // refusal can teach (no native disabled, no silent no-op).
    await expect(page.getByTestId("piece-plank-5")).toBeVisible();
    await expect(page.getByTestId("piece-plank-5")).toHaveAttribute("aria-describedby", "too-long-plank-5");
    await expect(tooLong5).toBeVisible();
    await expect(tooLong5).toContainText("Too long for 3 units left");

    await expect(page.getByTestId("piece-plank-6")).toHaveAttribute("data-oversized", "true");
    await expect(page.getByTestId("piece-plank-4")).toHaveAttribute("data-oversized", "true");
    // Exact fit is never dimmed.
    await expect(page.getByTestId("piece-plank-3")).toHaveAttribute("data-oversized", "false");
    await expect(page.getByTestId("too-long-plank-3")).toHaveCount(0);
  });

  test("hover/focus shows geometry preview, not color alone", async ({ page }) => {
    await page.getByTestId("piece-plank-7").click();
    await expect(page.getByTestId("placed-plank-7")).toBeVisible();

    await page.getByTestId("piece-plank-5").focus();
    const preview = page.getByTestId("overhang-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("Would stick out by 2 units");
    // Non-color signal: warning glyph plus striped geometry (width = excess).
    await expect(preview).toContainText("⚠");
    const width = await preview.evaluate((el) => (el as HTMLElement).style.width);
    expect(width).not.toBe("");
    await expect(page.getByTestId("bridge-open-slot")).toHaveAttribute("data-preview-overhang", "true");
    await expect(page.getByTestId("bridge-open-slot")).toHaveAttribute(
      "aria-label",
      /too long for 3 units left/i,
    );
  });

  test("refused place has visible + announced feedback, never silent", async ({ page }) => {
    await page.getByTestId("piece-plank-7").click();
    await expect(page.getByTestId("placed-plank-7")).toBeVisible();

    const feedback = page.getByTestId("bridge-feedback");
    const openSlot = page.getByTestId("bridge-open-slot");
    await expect(feedback).toHaveAttribute("data-denied-pulse", "0");

    // Attempt to place 5 (7+5=12, 2 past the 10-span).
    // aria-disabled controls need a forced click in Playwright; real
    // browsers still fire the event so the refusal can teach.
    await page.getByTestId("piece-plank-5").click({ force: true });

    // Visible: correction styling + denied pulse + falling car + still 3 open.
    await expect(feedback).toContainText("too long for 3 units left", { ignoreCase: true });
    await expect(feedback).toContainText("stick out by 2 units", { ignoreCase: true });
    await expect(feedback).toHaveAttribute("data-denied-pulse", "1");
    await expect(openSlot).toHaveAttribute("data-denied-pulse", "1");
    await expect(page.getByTestId("bridge-vehicle")).toHaveAttribute("data-state", "falling");
    await expect(openSlot).toContainText("3 open");
    // Piece was rejected, not placed.
    await expect(page.getByTestId("placed-plank-5")).toHaveCount(0);
    // Announced: live region with status role.
    await expect(feedback).toHaveAttribute("aria-live", "polite");
    await expect(feedback).toHaveAttribute("role", "status");

    // Second identical refusal still teaches (no silent no-op on repeat).
    await page.getByTestId("piece-plank-5").click({ force: true });
    await expect(feedback).toHaveAttribute("data-denied-pulse", "2");
    await expect(feedback).toContainText("too long for 3 units left", { ignoreCase: true });
  });
});
