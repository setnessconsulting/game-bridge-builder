/**
 * Bridge Builder release manifest (SDK-7).
 *
 * File hashing and verification come from
 * `@setnessconsulting/game-platform-sdk/release`. This script stamps the
 * Bridge Builder–specific validation evidence fields the hosted contract expects.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  generateReleaseManifest,
  verifyReleaseManifest,
} from "@setnessconsulting/game-platform-sdk/release";

const [, , distArgument = "dist", ...flags] = process.argv;
const distDir = path.resolve(distArgument);
const checkOnly = flags.includes("--check");
const manifestPath = path.join(distDir, "release-manifest.json");
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockfilePath = path.join(packageRoot, "package-lock.json");

const workflowRunUrl =
  process.env.GITHUB_SERVER_URL &&
  process.env.GITHUB_REPOSITORY &&
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
const inReleaseWorkflow = process.env.GITHUB_ACTIONS === "true" && Boolean(workflowRunUrl);

function stampBridgeBuilderEvidence(manifest) {
  const checks = [
    "typecheck",
    "unit-tests",
    "production-build",
    "real-phaser-swiftshader",
  ].map((name) => ({
    name,
    status: inReleaseWorkflow ? "executed-before-manifest" : "not-asserted",
    reference: workflowRunUrl,
  }));

  return {
    ...manifest,
    validationStatus: "candidate-not-approved",
    validationEvidence: {
      status: "candidate-not-approved",
      workflowRun: workflowRunUrl,
      checks,
      pending: [
        { name: "hosted-games-site-preview", status: "pending", reference: null },
        { name: "named-human-approval-gates", status: "pending", reference: null },
      ],
    },
  };
}

async function buildManifest() {
  const base = await generateReleaseManifest({
    distDir,
    gameSlug: "bridge-builder",
    releaseVersion:
      process.env.GAME_RELEASE_VERSION ?? process.env.npm_package_version ?? "0.1.0",
    commitSha: process.env.GAME_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "working-tree",
    kind: "static-web",
    entryFile: "index.html",
    lockfilePath,
  });
  return stampBridgeBuilderEvidence(base);
}

async function main() {
  await fs.access(path.join(distDir, "index.html"));
  const next = await buildManifest();

  if (checkOnly) {
    const current = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const verification = await verifyReleaseManifest(distDir, current);
    if (!verification.valid) {
      throw new Error(
        "release-manifest.json does not match the current dist payload:\n" +
          verification.errors.join("\n"),
      );
    }
    // Also confirm metadata fields the hosted reader asserts still match.
    if (current.game !== next.game || current.entryFile !== next.entryFile) {
      throw new Error("release-manifest.json game/entryFile metadata drifted");
    }
    if (current.validationStatus !== "candidate-not-approved") {
      throw new Error("release-manifest.json validationStatus must stay candidate-not-approved");
    }
    return;
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
