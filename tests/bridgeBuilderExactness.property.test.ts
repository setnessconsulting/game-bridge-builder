import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/games/core/rng";
import {
  assertCompositionExact,
  compositionUnits,
  exactFitVerdict,
} from "@/lib/bridgeBuilder/exactness";
import { generatePuzzle, createSessionX } from "@/lib/bridgeBuilder/generate";
import { SKILL_DEFINITIONS } from "@/lib/bridgeBuilder/skills";
import {
  applyBridgeIntent,
  createBridgeSession,
  filledUnitsOf,
  traySortedOf,
} from "@/lib/bridgeBuilder/session";
import { evaluatePlacement } from "@/lib/bridgeBuilder/engine";

describe("GAME-129 exactness property invariants", () => {
  it("composition sum equals authoritative filled units after every legal place", () => {
    for (const skill of SKILL_DEFINITIONS) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const rng = mulberry32(seed * 97 + skill.id.length);
        const sessionX = createSessionX(skill.id, rng);
        const puzzle = generatePuzzle(skill.id, rng, { index: seed, sessionX });
        let state = createBridgeSession(puzzle);
        expect(assertCompositionExact(puzzle, state.placed, filledUnitsOf(state))).toBe(true);

        for (const piece of [...traySortedOf(state)].slice(0, 4)) {
          if (state.phase !== "building") break;
          if (!traySortedOf(state).some((p) => p.id === piece.id)) continue;
          const result = applyBridgeIntent(state, { type: "placePiece", pieceId: piece.id });
          state = result.state;
          expect(
            assertCompositionExact(state.puzzle, state.placed, filledUnitsOf(state))
          ).toBe(true);
          expect(compositionUnits(state.puzzle, state.placed)).toBe(filledUnitsOf(state));
        }
      }
    }
  });

  it("verdicts are independent of unitPx and snapTolerancePx", () => {
    const cases = [
      { gap: 12, filled: 12 },
      { gap: 12, filled: 8 },
      { gap: 12, filled: 15 },
      { gap: 100, filled: 75 },
      { gap: 8, filled: 8 },
    ];
    for (const sample of cases) {
      const baseline = exactFitVerdict(sample.gap, sample.filled);
      for (const unitPx of [12, 24, 48]) {
        for (const snapTolerancePx of [0, 4, 16, 100]) {
          expect(
            exactFitVerdict(sample.gap, sample.filled, { unitPx, snapTolerancePx })
          ).toBe(baseline);
          const outcome = evaluatePlacement({ gapUnits: sample.gap }, 0, sample.filled);
          expect(outcome.status === "fit").toBe(baseline === "exact");
        }
      }
    }
  });

  it("overhang never mutates placed composition", () => {
    let overhangSeen = 0;
    for (let seed = 1; seed <= 80; seed += 1) {
      const rng = mulberry32(seed);
      const puzzle = generatePuzzle("bb-compose-20", rng, { index: seed });
      const decoy = puzzle.tray.find((p) => p.units > puzzle.gapUnits);
      if (!decoy) continue;
      overhangSeen += 1;
      const state = createBridgeSession(puzzle);
      const result = applyBridgeIntent(state, { type: "placePiece", pieceId: decoy.id });
      expect(result.state.lastOutcome?.status).toBe("overhang");
      expect(result.state.placed).toHaveLength(0);
      expect(filledUnitsOf(result.state)).toBe(compositionUnits(puzzle, []));
    }
    expect(overhangSeen).toBeGreaterThan(0);
  });

  it("session module has no canvas-engine import dependency", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = process.cwd();
    for (const rel of [
      "src/lib/bridgeBuilder/session.ts",
      "src/lib/bridgeBuilder/exactness.ts",
      "src/lib/bridgeBuilder/intents.ts",
      "src/lib/bridgeBuilder/engine.ts",
      "src/lib/bridgeBuilder/math.ts",
    ]) {
      const source = fs.readFileSync(path.join(root, rel), "utf8");
      expect(source).not.toMatch(/from\s+["']phaser["']/);
      expect(source).not.toMatch(/require\(\s*["']phaser["']\s*\)/);
    }
  });
});
