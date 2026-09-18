import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const [, , distArgument = "dist", ...flags] = process.argv;
const distDir = path.resolve(distArgument);
const checkOnly = flags.includes("--check");
const manifestPath = path.join(distDir, "release-manifest.json");

const contentTypes = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
  [".woff2", "font/woff2"],
]);

const workflowRunUrl =
  process.env.GITHUB_SERVER_URL &&
  process.env.GITHUB_REPOSITORY &&
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
const inReleaseWorkflow = process.env.GITHUB_ACTIONS === "true" && Boolean(workflowRunUrl);

async function filesUnder(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(absolute, relative)));
    } else if (entry.isFile() && relative !== "release-manifest.json") {
      files.push({ relative, absolute });
    }
  }
  return files;
}

async function sha256(filePath) {
  const bytes = await fs.readFile(filePath);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.byteLength,
  };
}

function contentTypeFor(relative) {
  return contentTypes.get(path.extname(relative).toLowerCase()) ?? "application/octet-stream";
}

async function buildManifest() {
  const files = {};
  for (const file of await filesUnder(distDir)) {
    const digest = await sha256(file.absolute);
    files[file.relative] = { ...digest, contentType: contentTypeFor(file.relative) };
  }

  return {
    schemaVersion: "1.0.0",
    game: "bridge-builder",
    version: process.env.GAME_RELEASE_VERSION ?? process.env.npm_package_version ?? "0.1.0",
    commit: process.env.GAME_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "working-tree",
    entryFile: "index.html",
    manifestFile: "release-manifest.json",
    validationStatus: "candidate-not-approved",
    validationEvidence: {
      status: "candidate-not-approved",
      workflowRun: workflowRunUrl,
      checks: [
        "typecheck",
        "unit-tests",
        "production-build",
        "real-phaser-swiftshader",
      ].map((name) => ({
        name,
        status: inReleaseWorkflow ? "executed-before-manifest" : "not-asserted",
        reference: workflowRunUrl,
      })),
      pending: [
        { name: "hosted-games-site-preview", status: "pending", reference: null },
        { name: "named-human-approval-gates", status: "pending", reference: null },
      ],
    },
    // The manifest describes the payload files; hashing itself would be
    // circular, so release-manifest.json is intentionally excluded here.
    files,
  };
}

async function main() {
  await fs.access(path.join(distDir, "index.html"));
  const next = await buildManifest();
  if (checkOnly) {
    const current = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const comparable = JSON.stringify({ ...current, files: next.files });
    const expected = JSON.stringify({ ...next, files: next.files });
    if (comparable !== expected) {
      throw new Error("release-manifest.json does not match the current dist payload");
    }
    return;
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
