import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/games/core/rng";
import {
  buildRound,
  createSessionX,
  generatePuzzle,
  nextSkillForBand,
} from "@/lib/bridgeBuilder/generate";
import { SKILL_DEFINITIONS, SKILLS_BY_BAND, skillById } from "@/lib/bridgeBuilder/skills";
import { countSubsetSolutions, findSubset } from "@/lib/bridgeBuilder/math";
import { difficultyForThird } from "@/lib/bridgeBuilder/adaptive";

const SEEDS = 500;

function puzzleFor(skillId: string, seed: number) {
  const rng = mulberry32(seed);
  const sessionX = createSessionX(skillId, rng);
  return generatePuzzle(skillId, rng, { index: seed, sessionX });
}

describe("skill catalog", () => {
  it("covers all 14 planned skills with CCSS tags", () => {
    expect(SKILL_DEFINITIONS).toHaveLength(14);
    for (const skill of SKILL_DEFINITIONS) {
      expect(skill.ccss.length).toBeGreaterThan(0);
      expect(skill.genPolicy.minDistinctSolutions).toBeGreaterThanOrEqual(1);
    }
  });

  it("maps every band to at least three skills", () => {
    for (const band of ["g12", "g34", "g56", "g78"] as const) {
      expect(SKILLS_BY_BAND[band].length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("generatePuzzle invariants (property)", () => {
  for (const skill of SKILL_DEFINITIONS) {
    it(`always emits a solvable tray for ${skill.id}`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const puzzle = puzzleFor(skill.id, seed);
        const need = puzzle.gapUnits - puzzle.presetPlaced.reduce((a, p) => a + p.units, 0);
        expect(need).toBeGreaterThan(0);
        const traySum = puzzle.tray.reduce((a, p) => a + p.units, 0);
        expect(traySum).toBeGreaterThanOrEqual(need);
        expect(puzzle.solutionCount).toBeGreaterThanOrEqual(1);
        expect(puzzle.tray.length).toBeGreaterThanOrEqual(5);
        expect(puzzle.tray.length).toBeLessThanOrEqual(7);
        expect(puzzle.supportsSecondConstruction).toBe(puzzle.solutionCount >= 2);
        expect(
          puzzle.gapUnits * puzzle.denominator
        ).toBeLessThan(2 ** 31);
      }
    });

    it(`labels every piece readably for ${skill.id}`, () => {
      const puzzle = puzzleFor(skill.id, 7);
      for (const piece of [...puzzle.tray, ...puzzle.presetPlaced]) {
        expect(piece.label.length).toBeGreaterThan(0);
      }
      expect(puzzle.gapLabel.length).toBeGreaterThan(0);
    });
  }
});

describe("determinism", () => {
  it("same seed yields identical puzzles", () => {
    const a = Array.from({ length: 5 }, (_, i) => puzzleFor("bb-compose-20", i + 1));
    const b = Array.from({ length: 5 }, (_, i) => puzzleFor("bb-compose-20", i + 1));
    expect(a.map((p) => `${p.gapUnits}:${p.tray.map((t) => t.units).join(",")}`)).toEqual(
      b.map((p) => `${p.gapUnits}:${p.tray.map((t) => t.units).join(",")}`)
    );
  });

  it("different seeds diverge", () => {
    const gaps = Array.from({ length: 10 }, (_, i) => puzzleFor("bb-compose-20", i + 50).gapUnits);
    expect(new Set(gaps).size).toBeGreaterThan(2);
  });
});

describe("whole-band second constructions supply", () => {
  it("offers multiple solutions for at least 45% of compose-10 puzzles", () => {
    let multi = 0;
    const total = 500;
    for (let seed = 1; seed <= total; seed += 1) {
      if (puzzleFor("bb-compose-10", seed).supportsSecondConstruction) multi += 1;
    }
    expect(multi / total).toBeGreaterThanOrEqual(0.45);
  });
});

describe("skill-specific shapes", () => {
  it("missing-addend pre-places part of the gap", () => {
    const puzzle = puzzleFor("bb-missing-addend", 3);
    expect(puzzle.presetPlaced.length).toBe(1);
    expect(puzzle.presetPlaced[0]!.units).toBeLessThan(puzzle.gapUnits);
  });

  it("mult-groups builds an equal-group gap", () => {
    const puzzle = puzzleFor("bb-mult-groups", 11);
    expect(puzzle.gapUnits % Math.max(...puzzle.tray.filter((p) => p.units > 0).map((p) => p.units))).toBeDefined();
    expect(findSubset(sortedTrayValues(puzzle), puzzle.gapUnits)).not.toBeNull();
  });

  it("fraction-equiv exposes a halves/quarters equivalence relation", () => {
    const puzzle = puzzleFor("bb-fraction-equiv", 5);
    expect(puzzle.denominator).toBe(8);
    expect(puzzle.hasEquivalenceRelation).toBe(true);
  });

  it("linear-eq keeps one consistent x across the session", () => {
    const rng = mulberry32(21);
    const x = createSessionX("bb-linear-eq", rng)!;
    const first = generatePuzzle("bb-linear-eq", mulberry32(22), { index: 1, sessionX: x });
    const second = generatePuzzle("bb-linear-eq", mulberry32(23), { index: 2, sessionX: x });
    const beamsOf = (p: typeof first) =>
      p.tray.filter((t) => t.kind === "beam-x").map((t) => t.units);
    for (const beam of beamsOf(first)) expect(beam).toBe(x);
    for (const beam of beamsOf(second)) expect(beam).toBe(x);
    expect(beamsOf(first).length).toBeGreaterThanOrEqual(2);
  });

  it("rational-eq includes a signed shim that is not required to solve", () => {
    const puzzle = puzzleFor("bb-rational-eq", 9);
    const shims = puzzle.tray.filter((t) => t.units < 0);
    expect(shims.length).toBeGreaterThanOrEqual(1);
    const positivesOnly = sortedValuesPositiveOnly(puzzle);
    expect(countSubsetSolutions(positivesOnly, puzzle.gapUnits)).toBeGreaterThanOrEqual(1);
    const shim = shims[0]!.units;
    expect(
      puzzle.tray.some((piece) => piece.units === puzzle.gapUnits + Math.abs(shim))
    ).toBe(true);
  });

  it("pythagorean-span annotates legs and braces exactly", () => {
    const puzzle = puzzleFor("bb-pythagorean-span", 13);
    expect(puzzle.legs).toBeDefined();
    const [a, b] = [Number(puzzle.legs!.a), Number(puzzle.legs!.b)];
    expect(a * a + b * b).toBe(puzzle.gapUnits * puzzle.gapUnits);
  });
});

function sortedTrayValues(puzzle: ReturnType<typeof puzzleFor>): number[] {
  return puzzle.tray
    .filter((p) => p.units > 0)
    .map((p) => p.units)
    .sort((a, b) => a - b);
}

function sortedValuesPositiveOnly(puzzle: ReturnType<typeof puzzleFor>): number[] {
  return sortedTrayValues(puzzle);
}

describe("band rotation", () => {
  it("cycles every skill in a band before repeating", () => {
    for (const band of ["g12", "g34", "g56", "g78"] as const) {
      const round = buildRound(band, mulberry32(20260827), {
        length: SKILLS_BY_BAND[band].length,
      });
      expect(new Set(round.puzzles.map((p) => p.skillId))).toEqual(
        new Set(SKILLS_BY_BAND[band].map((skill) => skill.id))
      );
    }
  });

  it("keeps a focused skill first while retaining fair rotation", () => {
    const round = buildRound("g34", mulberry32(20260827), {
      length: 4,
      biasedSkillIds: ["bb-fraction-equiv"],
    });
    expect(round.puzzles[0]?.skillId).toBe("bb-fraction-equiv");
    expect(new Set(round.puzzles.map((p) => p.skillId))).toEqual(
      new Set(SKILLS_BY_BAND.g34.map((skill) => skill.id))
    );
  });

  it("maps placement thirds to within-band generator pressure", () => {
    expect(difficultyForThird("early")).toBe("easier");
    expect(difficultyForThird("mid")).toBeUndefined();
    expect(difficultyForThird("late")).toBe("harder");
    expect(difficultyForThird(null)).toBeUndefined();
  });

  it("honors bias order before rotating the rest", () => {
    const rng = mulberry32(4);
    const skill = nextSkillForBand("g56", rng, ["bb-linear-eq"], 0);
    expect(skill.id).toBe("bb-linear-eq");
  });

  it("falls back safely with empty bias", () => {
    const rng = mulberry32(5);
    const skill = nextSkillForBand("g12", rng, [], 3);
    expect(skillById(skill.id)?.band).toBe("g12");
  });

  it("keeps one x value across separated linear-equation puzzles", () => {
    const round = buildRound("g56", mulberry32(2026), {
      length: 24,
      biasedSkillIds: ["bb-linear-eq"],
    });
    const xs = new Set(
      round.puzzles
        .flatMap((p) => p.tray.filter((piece) => piece.kind === "beam-x").map((piece) => piece.units))
    );
    expect(xs.size).toBeLessThanOrEqual(1);
  });

  it("does not reject valid denominator-based difficulty bounds", () => {
    for (const skillId of ["bb-fraction-equiv", "bb-decimals-tenths", "bb-unlike-denom", "bb-decimal-ops"]) {
      expect(() => generatePuzzle(skillId, mulberry32(17), { difficulty: "harder" })).not.toThrow();
      expect(() => generatePuzzle(skillId, mulberry32(18), { difficulty: "easier" })).not.toThrow();
    }
  });
});
