import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/games/core/rng";
import { difficultyForThird } from "@/lib/bridgeBuilder/adaptive";
import {
  BRIDGE_BEST_STORAGE_KEY,
  BRIDGE_MAX_BRIDGES,
  BRIDGE_SESSION_SECONDS,
  assertCompositionExact,
  compositionUnits,
  exactFitVerdict,
} from "@/lib/bridgeBuilder/exactness";
import { generatePuzzle, createSessionX } from "@/lib/bridgeBuilder/generate";
import { computeNextHint } from "@/lib/bridgeBuilder/hints";
import { BRIDGE_INTENT_TYPES } from "@/lib/bridgeBuilder/intents";
import {
  applyBridgeIntent,
  beginSecondBuild,
  createBridgeSession,
  filledUnitsOf,
} from "@/lib/bridgeBuilder/session";
import { scorePuzzle } from "@/lib/bridgeBuilder/engine";
import { validateEvent } from "@/lib/bridgeBuilder/telemetry";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

function puzzleFor(skillId: string, seed: number): BridgePuzzle {
  const rng = mulberry32(seed);
  const sessionX = createSessionX(skillId, rng);
  return generatePuzzle(skillId, rng, { index: seed, sessionX });
}

describe("GAME-129 golden exactness fixtures", () => {
  it("covers exact fit via session place intents", () => {
    const synthetic: BridgePuzzle = {
      id: "exact#1",
      skillId: "bb-compose-10",
      band: "g12",
      denominator: 1,
      gapUnits: 5,
      gapLabel: "5",
      ticksVisible: true,
      tray: [
        { id: "a", units: 2, label: "2", kind: "plank" },
        { id: "b", units: 3, label: "3", kind: "plank" },
        { id: "c", units: 9, label: "9", kind: "plank" },
        { id: "d", units: 8, label: "8", kind: "plank" },
        { id: "e", units: 7, label: "7", kind: "plank" },
      ],
      presetPlaced: [],
      parPieces: 2,
      solutionCount: 1,
      supportsSecondConstruction: false,
      hasEquivalenceRelation: false,
    };
    let state = createBridgeSession(synthetic);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" }).state;
    expect(state.phase).toBe("exact");
    expect(filledUnitsOf(state)).toBe(state.puzzle.gapUnits);
    expect(assertCompositionExact(state.puzzle, state.placed, filledUnitsOf(state))).toBe(true);
  });

  it("reports underfill (partial) without committing an overhang", () => {
    const synthetic: BridgePuzzle = {
      id: "underfill#1",
      skillId: "bb-compose-10",
      band: "g12",
      denominator: 1,
      gapUnits: 10,
      gapLabel: "10",
      ticksVisible: true,
      tray: [
        { id: "p3", units: 3, label: "3", kind: "plank" },
        { id: "p4", units: 4, label: "4", kind: "plank" },
        { id: "p5", units: 5, label: "5", kind: "plank" },
        { id: "p2", units: 2, label: "2", kind: "plank" },
        { id: "p1", units: 1, label: "1", kind: "plank" },
      ],
      presetPlaced: [],
      parPieces: 2,
      solutionCount: 3,
      supportsSecondConstruction: true,
      hasEquivalenceRelation: false,
    };
    let state = createBridgeSession(synthetic);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "p3" }).state;
    expect(state.lastOutcome?.status).toBe("partial");
    expect(filledUnitsOf(state)).toBe(3);
    expect(exactFitVerdict(10, 3)).toBe("underfill");
  });

  it("reports overfill (overhang) without committing the piece", () => {
    const synthetic: BridgePuzzle = {
      id: "overfill#1",
      skillId: "bb-compose-10",
      band: "g12",
      denominator: 1,
      gapUnits: 6,
      gapLabel: "6",
      ticksVisible: true,
      tray: [
        { id: "p9", units: 9, label: "9", kind: "plank" },
        { id: "p3", units: 3, label: "3", kind: "plank" },
        { id: "p2", units: 2, label: "2", kind: "plank" },
        { id: "p4", units: 4, label: "4", kind: "plank" },
        { id: "p1", units: 1, label: "1", kind: "plank" },
      ],
      presetPlaced: [],
      parPieces: 2,
      solutionCount: 2,
      supportsSecondConstruction: true,
      hasEquivalenceRelation: false,
    };
    const state = createBridgeSession(synthetic);
    const result = applyBridgeIntent(state, { type: "placePiece", pieceId: "p9" });
    expect(result.state.lastOutcome?.status).toBe("overhang");
    expect(result.state.placed).toHaveLength(0);
    expect(exactFitVerdict(6, 9)).toBe("overfill");
  });

  it("supports multiple valid combinations and second-build reset", () => {
    const synthetic: BridgePuzzle = {
      id: "multi#1",
      skillId: "bb-compose-10",
      band: "g12",
      denominator: 1,
      gapUnits: 10,
      gapLabel: "10",
      ticksVisible: true,
      tray: [
        { id: "a", units: 4, label: "4", kind: "plank" },
        { id: "b", units: 6, label: "6", kind: "plank" },
        { id: "c", units: 3, label: "3", kind: "plank" },
        { id: "d", units: 7, label: "7", kind: "plank" },
        { id: "e", units: 5, label: "5", kind: "plank" },
      ],
      presetPlaced: [],
      parPieces: 2,
      solutionCount: 2,
      supportsSecondConstruction: true,
      hasEquivalenceRelation: false,
    };
    let state = createBridgeSession(synthetic);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" }).state;
    expect(state.phase).toBe("exact");
    expect(state.puzzle.supportsSecondConstruction).toBe(true);
    state = beginSecondBuild(state);
    expect(state.placed).toHaveLength(0);
    expect(state.secondActive).toBe(true);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "c" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "d" }).state;
    expect(state.phase).toBe("exact");
    expect(filledUnitsOf(state)).toBe(10);
  });

  it("handles select, remove, reset, and submit legal actions", () => {
    const synthetic: BridgePuzzle = {
      id: "actions#1",
      skillId: "bb-compose-20",
      band: "g12",
      denominator: 1,
      gapUnits: 12,
      gapLabel: "12",
      ticksVisible: false,
      tray: [
        { id: "a", units: 5, label: "5", kind: "plank" },
        { id: "b", units: 7, label: "7", kind: "plank" },
        { id: "c", units: 4, label: "4", kind: "plank" },
        { id: "d", units: 8, label: "8", kind: "plank" },
        { id: "e", units: 3, label: "3", kind: "plank" },
      ],
      presetPlaced: [],
      parPieces: 2,
      solutionCount: 2,
      supportsSecondConstruction: true,
      hasEquivalenceRelation: false,
    };
    let state = createBridgeSession(synthetic);
    state = applyBridgeIntent(state, { type: "selectPiece", pieceId: "a" }).state;
    expect(state.selectedPieceId).toBe("a");
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    expect(state.placed.map((p) => p.id)).toEqual(["a"]);
    state = applyBridgeIntent(state, { type: "removePiece", pieceId: "a" }).state;
    expect(state.placed).toHaveLength(0);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "c" }).state;
    state = applyBridgeIntent(state, { type: "reset" }).state;
    expect(state.placed).toHaveLength(0);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "submit" }).state;
    expect(state.phase).toBe("incorrectSubmit");
    state = applyBridgeIntent(state, { type: "continue" }).state;
    expect(state.phase).toBe("building");
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" }).state;
    expect(state.phase).toBe("exact");
  });

  it("covers representative curriculum families with pinned seeds", () => {
    const families: Array<{ skillId: string; seed: number; band: string }> = [
      { skillId: "bb-compose-10", seed: 3, band: "g12" },
      { skillId: "bb-fraction-equiv", seed: 5, band: "g34" },
      { skillId: "bb-decimals-tenths", seed: 9, band: "g34" },
      { skillId: "bb-unlike-denom", seed: 7, band: "g56" },
      { skillId: "bb-decimal-ops", seed: 11, band: "g56" },
      { skillId: "bb-ratio-scale", seed: 13, band: "g56" },
      { skillId: "bb-linear-eq", seed: 17, band: "g56" },
      { skillId: "bb-rational-eq", seed: 19, band: "g78" },
      { skillId: "bb-scale-drawing", seed: 23, band: "g78" },
      { skillId: "bb-pythagorean-span", seed: 29, band: "g78" },
    ];
    for (const family of families) {
      const puzzle = puzzleFor(family.skillId, family.seed);
      expect(puzzle.band).toBe(family.band);
      expect(puzzle.solutionCount).toBeGreaterThanOrEqual(1);
      const state = createBridgeSession(puzzle);
      expect(assertCompositionExact(puzzle, state.placed, filledUnitsOf(state))).toBe(true);
      expect(compositionUnits(puzzle, [])).toBe(
        puzzle.presetPlaced.reduce((a, p) => a + p.units, 0)
      );
      if (family.skillId === "bb-rational-eq") {
        expect(puzzle.tray.some((p) => p.units < 0)).toBe(true);
      }
      if (family.skillId === "bb-pythagorean-span") {
        expect(puzzle.legs).toBeDefined();
      }
      if (family.skillId === "bb-linear-eq") {
        expect(puzzle.tray.some((p) => p.kind === "beam-x" || p.kind === "beam-2x")).toBe(true);
      }
    }
  });

  it("freezes scoring, hints, adaptive knob, telemetry privacy, and session limits", () => {
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: false })).toBe(12);
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: true })).toBe(5);
    expect(BRIDGE_SESSION_SECONDS).toBe(90);
    expect(BRIDGE_MAX_BRIDGES).toBe(6);
    expect(BRIDGE_BEST_STORAGE_KEY).toBe("levelbest.bridge-builder.best");
    expect(difficultyForThird("early")).toBe("easier");
    expect(difficultyForThird("late")).toBe("harder");

    const hint = computeNextHint({
      gapUnits: 12,
      filledUnits: 0,
      trayValues: [3, 4, 5, 8],
      attempts: 2,
      hintLevelShown: 0,
    });
    expect(hint?.level).toBe(1);

    expect(
      validateEvent({
        type: "session_start",
        ts: 1,
        payload: { childId: "nope" },
      })
    ).toBe(false);
    expect(
      validateEvent({
        type: "place_attempt",
        ts: 1,
        payload: { result: "fit" },
      })
    ).toBe(true);

    expect(BRIDGE_INTENT_TYPES).toContain("placePiece");
    expect(BRIDGE_INTENT_TYPES).toContain("presentationComplete");
  });

  it("signed overshoot + shim restores exact fit", () => {
    const synthetic: BridgePuzzle = {
      id: "shim#1",
      skillId: "bb-rational-eq",
      band: "g78",
      denominator: 1,
      gapUnits: 12,
      gapLabel: "12",
      ticksVisible: false,
      tray: [
        { id: "big", units: 13, label: "13", kind: "plank" },
        { id: "shim", units: -1, label: "−1", kind: "shim" },
        { id: "a", units: 5, label: "5", kind: "plank" },
        { id: "b", units: 7, label: "7", kind: "plank" },
        { id: "c", units: 4, label: "4", kind: "plank" },
      ],
      presetPlaced: [],
      parPieces: 2,
      solutionCount: 2,
      supportsSecondConstruction: true,
      hasEquivalenceRelation: false,
    };
    let state = createBridgeSession(synthetic);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "big" }).state;
    expect(state.lastOutcome?.status).toBe("overshoot");
    expect(state.placed).toHaveLength(1);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "shim" }).state;
    expect(state.phase).toBe("exact");
    expect(filledUnitsOf(state)).toBe(12);
  });
});
