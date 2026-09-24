import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const engineFiles = [
  "engine.ts",
  "exactness.ts",
  "math.ts",
  "generate.ts",
  "hints.ts",
  "adaptive.ts",
  "session.ts",
];

describe("Bridge Builder authority boundary", () => {
  it("keeps engine and session modules free of renderer imports", () => {
    for (const filename of engineFiles) {
      const source = readFileSync(
        resolve(process.cwd(), "src/lib/bridgeBuilder", filename),
        "utf8",
      );
      expect(source, filename).not.toMatch(/from\s+["'][^"']*(?:phaser|layout)[^"']*["']/i);
      expect(source, filename).not.toMatch(/\bimport\s*\(\s*["'][^"']*phaser/i);
    }
  });

  it("keeps placement verdict invariant across presentation sizes", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/bridgeBuilder/exactness.ts"),
      "utf8",
    );
    expect(source).toContain("compositionUnits(puzzle, placed) === authoritativeFilledUnits");
    expect(source).toContain("filledUnits === gapUnits");
    expect(source).not.toMatch(/snapTolerancePx\s*[<>]=?/);
  });
});
