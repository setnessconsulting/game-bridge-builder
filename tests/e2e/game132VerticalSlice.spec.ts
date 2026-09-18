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

async function dragTrayPiece(page: Page, pieceId: string) {
  const canvas = page.locator('[data-testid="bridge-phaser-canvas-host"] canvas');
  await expect(page.getByTestId("bridge-phaser-host")).toHaveAttribute(
    "data-ready",
    "true"
  );

  // Prefer the live DOM box Phaser hit-testing uses (getBoundingClientRect),
  // not Playwright's boundingBox, which can disagree while layout settles.
  const metrics = await canvas.evaluate((node) => {
    const element = node as HTMLCanvasElement;
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      bufferWidth: element.width,
      bufferHeight: element.height,
    };
  });
  const rawGeometry = await page
    .getByTestId("bridge-phaser-host")
    .getAttribute("data-input-geometry");
  if (!rawGeometry) throw new Error("Missing live Phaser input geometry");
  const geometry = JSON.parse(rawGeometry) as {
    tray: Array<{
      pieceId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    gap: { x: number; y: number; width: number; height: number } | null;
  };
  const piece = geometry.tray.find((candidate) => candidate.pieceId === pieceId);
  if (!piece || !geometry.gap) {
    throw new Error(
      `Missing live Phaser geometry for ${pieceId}: ${rawGeometry}`
    );
  }

  const scaleX = metrics.width / metrics.bufferWidth;
  const scaleY = metrics.height / metrics.bufferHeight;
  const start = {
    x: metrics.left + piece.x * scaleX,
    y: metrics.top + piece.y * scaleY,
  };
  const end = {
    x: metrics.left + geometry.gap.x * scaleX,
    y: metrics.top + geometry.gap.y * scaleY,
  };

  console.log(
    "GAME132_DRAG_GEOMETRY",
    JSON.stringify({
      pieceId,
      metrics,
      piece,
      gap: geometry.gap,
      start,
      end,
    })
  );
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

    await dragTrayPiece(page, "a");
    await expect(page.getByTestId("bridge-composition")).toHaveText("4 = 4 units");

    await dragTrayPiece(page, "b");
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
