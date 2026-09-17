import { expect, test } from "@playwright/test";

test("loads the pinned Bridge Builder candidate through the hosted games-site frame", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "requires a deployed games-site preview");

  await page.goto("/bridge-builder/play/");
  await expect(page.locator(".static-game-frame")).toBeVisible();

  const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
  await expect(frame.getByTestId("bridge-builder-candidate")).toBeVisible();
  await expect(frame.locator("canvas")).toHaveCount(1);
  await expect(frame.getByTestId("renderer-status")).toHaveText(/Canvas ready|DOM view active/);
  await expect(frame.getByTestId("bridge-dom-mirror")).toBeVisible();

  const assetResponse = await page.request.head(
    "/game-assets/bridge-builder/0.1.0-qualification.1/index.html",
  );
  expect(assetResponse.status()).toBe(200);
  expect(assetResponse.headers()["cache-control"]).toContain("immutable");

  const manifestResponse = await page.request.get(
    "/game-assets/bridge-builder/0.1.0-qualification.1/release-manifest.json",
  );
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.game).toBe("bridge-builder");
  expect(manifest.validationStatus).toBe("candidate-not-approved");
  expect(manifest.files["index.html"].sha256).toMatch(/^[a-f0-9]{64}$/);
});
