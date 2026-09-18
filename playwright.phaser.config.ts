import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "phaserRealRender.spec.ts",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 800, height: 500 },
  },
  projects: [
    {
      name: "chromium-swiftshader",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
          ],
        },
      },
    },
  ],
  webServer: {
    command:
      "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/tests/fixtures/phaser-render/index.html",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
