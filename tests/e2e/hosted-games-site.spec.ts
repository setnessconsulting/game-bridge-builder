import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

const candidateVersion =
  process.env.BRIDGE_BUILDER_PREVIEW_VERSION ?? "0.1.0-qualification.4";

test("loads the pinned Bridge Builder candidate through the hosted games-site frame", async ({
  page,
}) => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "requires a deployed games-site preview",
  );

  await page.goto("/bridge-builder/play/");
  await expect(page.locator(".static-game-frame")).toBeVisible();

  const iframe = page.locator('iframe[title="Bridge Builder game"]');
  await expect(iframe).toHaveAttribute(
    "src",
    `/game-assets/bridge-builder/${candidateVersion}/index.html`,
  );
  const frame = page.frameLocator('iframe[title="Bridge Builder game"]');
  await expect(frame.getByTestId("bridge-builder-candidate")).toBeVisible();
  await frame.getByTestId("bridge-start").click();
  await expect(frame.locator("canvas")).toHaveCount(1);
  await expect(frame.getByTestId("renderer-status")).toHaveText("Canvas ready");
  await expect(frame.getByTestId("bridge-dom-mirror")).toBeVisible();

  // Exercise the actual candidate inside the hosted frame, not only the shell.
  await frame.getByTestId("piece-plank-4").click();
  await frame.getByTestId("bridge-open-slot").click();
  await frame.getByTestId("piece-plank-6").click();
  await frame.getByTestId("bridge-open-slot").click();
  await expect(frame.getByTestId("bridge-feedback")).toContainText(
    "Exact fit. The crossing is ready.",
  );

  const assetResponse = await page.request.head(
    `/game-assets/bridge-builder/${candidateVersion}/index.html`,
  );
  expect(assetResponse.status()).toBe(200);
  expect(assetResponse.headers()["cache-control"]).toContain("immutable");

  const manifestResponse = await page.request.get(
    `/game-assets/bridge-builder/${candidateVersion}/release-manifest.json`,
  );
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.game).toBe("bridge-builder");
  expect(manifest.validationStatus).toBe("candidate-not-approved");
  expect(manifest.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(manifest.files["index.html"].sha256).toMatch(/^[a-f0-9]{64}$/);

  const entries = Object.entries(manifest.files) as Array<
    [string, { bytes: number; contentType: string; sha256: string }]
  >;
  expect(entries.length).toBeGreaterThan(0);
  for (const [assetPath, metadata] of entries) {
    const response = await page.request.get(
      `/game-assets/bridge-builder/${candidateVersion}/${assetPath}`,
    );
    expect(
      response.status(),
      `${assetPath} should be served from the pinned candidate`,
    ).toBe(200);
    expect(response.headers()["content-type"]).toContain(metadata.contentType);
    expect(response.headers()["cache-control"]).toContain("immutable");

    const payload = await response.body();
    expect(
      payload.byteLength,
      `${assetPath} byte count should match the manifest`,
    ).toBe(metadata.bytes);
    expect(
      createHash("sha256").update(payload).digest("hex"),
      `${assetPath} hash should match the manifest`,
    ).toBe(metadata.sha256);
  }
});
