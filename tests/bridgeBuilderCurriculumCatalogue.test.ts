import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_DEFINITIONS } from "@/lib/bridgeBuilder/skills";

const cataloguePath = resolve(
  process.cwd(),
  "docs/games/bridge-builder/final-state/CURRICULUM_CATALOGUE.md",
);

describe("GAME-295 curriculum catalogue", () => {
  it("matches the runtime registry exactly and excludes retired standards codes", () => {
    const catalogue = readFileSync(cataloguePath, "utf8");
    const rows = [...catalogue.matchAll(/^\| `([^`]+)` \| `([^`]+)` \| (\d+)-(\d+) \| ([^|]+) \|$/gm)];
    const projected = rows.map(([, id, band, lowGrade, highGrade, standards]) => ({
      id,
      band,
      grades: [Number(lowGrade), Number(highGrade)],
      ccss: standards!.split(", ").map((code) => code.trim()),
    }));

    expect(projected).toEqual(
      SKILL_DEFINITIONS.map((skill) => ({
        id: skill.id,
        band: skill.band,
        grades: [...skill.grades],
        ccss: [...skill.ccss],
      })),
    );
    expect(projected).toHaveLength(14);
    expect(new Set(projected.map((skill) => skill.id)).size).toBe(14);
    const currentStandards = projected.flatMap((skill) => skill.ccss);
    expect(currentStandards).not.toContain("3.MD.D.8");
    expect(currentStandards).not.toContain("6.G.A.1");
    expect(currentStandards).not.toContain("8.EE.C.7");

    const bands = new Set(projected.map((skill) => skill.band));
    expect(bands).toEqual(new Set(["g12", "g34", "g56", "g78"]));
    for (const band of bands) {
      expect(projected.filter((skill) => skill.band === band).length).toBeGreaterThanOrEqual(3);
    }
  });
});
