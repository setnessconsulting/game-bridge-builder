import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestScript = path.join(repositoryRoot, "scripts", "create-release-manifest.mjs");
const manifestEnv = {
  ...process.env,
  GAME_RELEASE_VERSION: "0.1.0-test",
  GAME_COMMIT_SHA: "a".repeat(40),
  GITHUB_ACTIONS: "",
  GITHUB_SERVER_URL: "",
};

function runManifestCommand(distDir: string, check = false): void {
  execFileSync(
    process.execPath,
    [manifestScript, distDir, ...(check ? ["--check"] : [])],
    { cwd: repositoryRoot, env: manifestEnv, stdio: "pipe" },
  );
}

describe("Bridge Builder release manifest", () => {
  it("rejects stale version, commit, lockfile, aggregate, and validation metadata", async () => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bridge-builder-release-manifest-"));
    const distDir = path.join(temporaryRoot, "dist");
    await fs.mkdir(distDir, { recursive: true });
    await fs.writeFile(path.join(distDir, "index.html"), "<main>candidate</main>\n", "utf8");

    try {
      runManifestCommand(distDir);
      const manifestPath = path.join(distDir, "release-manifest.json");
      const pristine = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
      const mutations: Array<[string, (manifest: Record<string, unknown>) => void]> = [
        ["version", (manifest) => { manifest.version = "0.0.0-stale"; }],
        ["commit", (manifest) => { manifest.commit = "b".repeat(40); }],
        ["lockfileSha256", (manifest) => { manifest.lockfileSha256 = "0".repeat(64); }],
        ["aggregateSha256", (manifest) => { manifest.aggregateSha256 = "0".repeat(64); }],
        ["validationEvidence", (manifest) => { manifest.validationEvidence = { status: "qualified", checks: [] }; }],
      ];

      for (const [field, mutate] of mutations) {
        const stale = structuredClone(pristine);
        mutate(stale);
        await fs.writeFile(manifestPath, `${JSON.stringify(stale, null, 2)}\n`, "utf8");
        expect(() => runManifestCommand(distDir, true), field).toThrow();
      }

      await fs.writeFile(manifestPath, `${JSON.stringify(pristine, null, 2)}\n`, "utf8");
      expect(() => runManifestCommand(distDir, true)).not.toThrow();
    } finally {
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
