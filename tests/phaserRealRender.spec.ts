import { expect, test, type Page } from "@playwright/test";

const FIXTURE =
  "http://127.0.0.1:4173/tests/fixtures/phaser-render/index.html";
const EXPECTED_RGB = { red: 185, green: 124, blue: 64 };

type Diagnostics = {
  phaserVersion: string;
  frame: number;
  sceneActive: boolean;
  rendererClass: string;
  isWebGL: boolean;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  rendererIdentity: string;
  glError: number;
  displayListCount: number;
  canvasCount: number;
};

async function loadHarness(
  page: Page,
  mode: "positive" | "negative"
): Promise<Diagnostics> {
  await page.goto(`${FIXTURE}?mode=${mode}`);
  await page.waitForFunction(() => {
    const harness = (window as typeof window & {
      __GAME_166__?: {
        getDiagnostics: () => Diagnostics;
      };
    }).__GAME_166__;
    if (!harness) return false;
    const diagnostics = harness.getDiagnostics();
    return diagnostics.frame > 1 && diagnostics.sceneActive;
  });
  return page.evaluate(() => {
    const harness = (window as typeof window & {
      __GAME_166__: { getDiagnostics: () => Diagnostics };
    }).__GAME_166__;
    return harness.getDiagnostics();
  });
}

async function samplePixel(page: Page) {
  return page.evaluate(() => {
    const harness = (window as typeof window & {
      __GAME_166__: {
        snapshotExpectedPixel: () => Promise<{
          red: number;
          green: number;
          blue: number;
          alpha: number;
        }>;
      };
    }).__GAME_166__;
    return harness.snapshotExpectedPixel();
  });
}

test.afterEach(async ({ page }) => {
  await page
    .evaluate(() => {
      const harness = (window as typeof window & {
        __GAME_166__?: { destroy: () => void };
      }).__GAME_166__;
      harness?.destroy();
    })
    .catch(() => {});
});

test("actual installed Phaser renders deterministic placed piece", async ({
  page,
  browser,
}) => {
  const mode =
    process.env.GAME_166_BREAK_RENDER === "1" ? "negative" : "positive";
  const initial = await loadHarness(page, mode);

  console.log(
    "GAME166_BROWSER",
    JSON.stringify({
      browserType: browser.browserType().name(),
      browserVersion: browser.version(),
    })
  );
  console.log("GAME166_RENDERER", JSON.stringify(initial));

  expect(initial.phaserVersion).toBe("4.2.1");
  expect(initial.sceneActive).toBe(true);
  expect(initial.rendererClass).toContain("WebGLRenderer");
  expect(initial.isWebGL).toBe(true);
  expect(initial.drawingBufferWidth).toBeGreaterThan(0);
  expect(initial.drawingBufferHeight).toBeGreaterThan(0);
  expect(initial.rendererIdentity).toMatch(/swiftshader/i);
  expect(initial.glError).toBe(0);
  expect(initial.displayListCount).toBeGreaterThan(0);
  expect(initial.canvasCount).toBe(1);

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const harness = (window as typeof window & {
          __GAME_166__: {
            getDiagnostics: () => Diagnostics;
          };
        }).__GAME_166__;
        return harness.getDiagnostics().frame;
      })
    )
    .toBeGreaterThan(initial.frame);

  const pixel = await samplePixel(page);
  console.log("GAME166_PIXEL", JSON.stringify(pixel));
  expect(pixel, "GAME166_RENDER_ORACLE expected the wood placed-piece pixel").toMatchObject(EXPECTED_RGB);

  const finalDiagnostics = await page.evaluate(() => {
    const harness = (window as typeof window & {
      __GAME_166__: { getDiagnostics: () => Diagnostics };
    }).__GAME_166__;
    return harness.getDiagnostics();
  });
  expect(finalDiagnostics.glError).toBe(0);
});

test("negative control keeps real renderer healthy while omitting placed piece", async ({
  page,
}) => {
  const initial = await loadHarness(page, "negative");

  expect(initial.phaserVersion).toBe("4.2.1");
  expect(initial.sceneActive).toBe(true);
  expect(initial.rendererClass).toContain("WebGLRenderer");
  expect(initial.isWebGL).toBe(true);
  expect(initial.drawingBufferWidth).toBeGreaterThan(0);
  expect(initial.drawingBufferHeight).toBeGreaterThan(0);
  expect(initial.rendererIdentity).toMatch(/swiftshader/i);
  expect(initial.glError).toBe(0);
  expect(initial.displayListCount).toBeGreaterThan(0);

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const harness = (window as typeof window & {
          __GAME_166__: {
            getDiagnostics: () => Diagnostics;
          };
        }).__GAME_166__;
        return harness.getDiagnostics().frame;
      })
    )
    .toBeGreaterThan(initial.frame);

  const pixel = await samplePixel(page);
  console.log("GAME166_NEGATIVE_PIXEL", JSON.stringify(pixel));
  expect(pixel).not.toMatchObject(EXPECTED_RGB);
});
