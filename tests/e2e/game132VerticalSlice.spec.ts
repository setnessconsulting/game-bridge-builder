import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function openSlice(page: Page, suffix = "") {
  await page.goto(`/?game132=1${suffix}`);
  await expect(page.getByTestId("bridge-phaser-a11y")).toBeVisible();
  await expect(
    page.locator('[data-testid="bridge-phaser-canvas-host"] canvas')
  ).toBeVisible();
  await expect(page.getByTestId("bridge-phaser-host")).toHaveAttribute(
    "data-ready",
    "true"
  );
}

async function activateWithKeyboard(page: Page, control: Locator) {
  await control.focus();
  await page.keyboard.press("Enter");
}

async function dragTrayPiece(
  page: Page,
  currentUnits: number[],
  targetUnits: number
) {
  const canvas = page.locator('[data-testid="bridge-phaser-canvas-host"] canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Phaser canvas has no bounding box");
  const size = await canvas.evaluate((node) => {
    const element = node as HTMLCanvasElement;
    return { width: element.width, height: element.height };
  });

  const widths = currentUnits.map((units) => Math.max(36, Math.abs(units) * 24 * 0.85));
  let x = 24;
  let centerX: number | null = null;
  for (let index = 0; index < currentUnits.length; index += 1) {
    const width = widths[index]!;
    if (currentUnits[index] === targetUnits) {
      centerX = x + width / 2;
      break;
    }
    x += width + 12;
  }
  if (centerX === null) throw new Error(`No tray piece for ${targetUnits}`);

  const gapY = Math.max(120, size.height * 0.45);
  const trayY = Math.min(size.height - 48, gapY + 90);
  const scaleX = box.width / size.width;
  const scaleY = box.height / size.height;
  const start = {
    x: box.x + centerX * scaleX,
    y: box.y + trayY * scaleY,
  };
  const end = {
    x: box.x + 80 * scaleX,
    y: box.y + gapY * scaleY,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2, {
    steps: 4,
  });
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
}

test.describe("GAME-132 one-bridge Phaser vertical slice", () => {
  test("keyboard-only selection and placement reaches authoritative exact completion", async ({
    page,
  }) => {
    await openSlice(page);

    await activateWithKeyboard(page, page.getByRole("button", { name: "4 (4 units)" }));
    await activateWithKeyboard(page, page.getByRole("button", { name: "Place selected" }));
    await activateWithKeyboard(page, page.getByRole("button", { name: "6 (6 units)" }));
    await activateWithKeyboard(page, page.getByRole("button", { name: "Place selected" }));

    await expect(page.getByTestId("bridge-composition")).toHaveText("4 + 6 = 10 units");
    await expect(page.getByTestId("bridge-verdict")).toHaveText("exact");
    await expect(page.getByTestId("bridge-difference")).toHaveText("Exact: 0");
    await expect(page.getByTestId("bridge-completion")).toHaveText(
      "Complete. The bridge is ready."
    );
  });

  test("tap/click path exposes underfill and overfill feedback from authoritative state", async ({
    page,
  }) => {
    await openSlice(page);

    await page.getByRole("button", { name: "4 (4 units)" }).click();
    await page.getByRole("button", { name: "Place selected" }).click();
    await page.getByRole("button", { name: "Check it" }).click();
    await expect(page.getByTestId("bridge-verdict")).toHaveText("underfill");
    await expect(page.getByTestId("bridge-difference")).toHaveText("Remaining 6");
    await expect(page.getByTestId("bridge-feedback")).toContainText("Remaining 6");

    await page.getByRole("button", { name: "Reset" }).click();
    await page.getByRole("button", { name: "4 (4 units)" }).click();
    await page.getByRole("button", { name: "Place selected" }).click();
    await page.getByRole("button", { name: "7 (7 units)" }).click();
    await page.getByRole("button", { name: "Place selected" }).click();
    await expect(page.getByTestId("bridge-verdict")).toHaveText("overfill");
    await expect(page.getByTestId("bridge-difference")).toHaveText("Over by 1");
    await expect(page.getByTestId("bridge-composition")).toHaveText("4 = 4 units");
  });

  test("real Phaser canvas pointer drag reaches the same exact bridge", async ({ page }) => {
    await openSlice(page);

    // Phaser tray preserves the authoritative session tray order: 4,6,3,7,5.
    await dragTrayPiece(page, [4, 6, 3, 7, 5], 4);
    await expect(page.getByTestId("bridge-composition")).toHaveText("4 = 4 units");

    // After 4 is consumed the tray is 6,3,7,5.
    await dragTrayPiece(page, [6, 3, 7, 5], 6);
    await expect(page.getByTestId("bridge-composition")).toHaveText("4 + 6 = 10 units");
    await expect(page.getByTestId("bridge-verdict")).toHaveText("exact");
  });

  test("reduced motion preserves exact completion and skips crossing dependency", async ({
    page,
  }) => {
    await openSlice(page, "&reduced=1");

    await page.getByRole("button", { name: "4 (4 units)" }).click();
    await page.getByRole("button", { name: "Place selected" }).click();
    await page.getByRole("button", { name: "6 (6 units)" }).click();
    await page.getByRole("button", { name: "Place selected" }).click();

    await expect(page.getByTestId("bridge-phaser-host")).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    await expect(page.getByTestId("bridge-verdict")).toHaveText("exact");
    await expect(page.getByTestId("bridge-completion")).toHaveText(
      "Complete. The bridge is ready."
    );
  });

  test("one implementation stays authoritative across phone, tablet, desktop and passes DOM axe gate", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await openSlice(page);
    await expect(page.getByTestId("bridge-phaser-host")).toHaveAttribute(
      "data-responsive",
      "phone"
    );

    await page.setViewportSize({ width: 820, height: 900 });
    await expect(page.getByTestId("bridge-phaser-host")).toHaveAttribute(
      "data-responsive",
      "tablet"
    );

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId("bridge-phaser-host")).toHaveAttribute(
      "data-responsive",
      "desktop"
    );
    await expect(page.getByTestId("bridge-composition")).toHaveText("empty = 0 units");
    await expect(page.getByTestId("bridge-difference")).toHaveText("Remaining 10");

    const results = await new AxeBuilder({ page })
      .include('[data-testid="bridge-phaser-a11y"]')
      .analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blocking).toEqual([]);
  });
});
