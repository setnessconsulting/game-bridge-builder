import { describe, expect, it } from "vitest";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import {
  createInputNormalizerState,
  normalizeDirectInput,
  normalizePointerEvent,
  type BridgeDirectInputSource,
} from "@/lib/bridgeBuilder/phaser/normalizeInput";
import { deriveBridgeSemanticState } from "@/lib/bridgeBuilder/semantic";
import {
  applyBridgeIntent,
  createBridgeSession,
  filledUnitsOf,
} from "@/lib/bridgeBuilder/session";
import type { BridgeIntentAction } from "@/lib/bridgeBuilder/intents";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";

const puzzle: BridgePuzzle = {
  id: "game-132-test#1",
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
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 2,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

function applyAll(intents: BridgeIntentAction[]) {
  let state = createBridgeSession(puzzle);
  for (const intent of intents) {
    state = applyBridgeIntent(state, intent).state;
  }
  return state;
}

function directPlacement(source: BridgeDirectInputSource): BridgeIntentAction[] {
  let normalizer = createInputNormalizerState();
  const intents: BridgeIntentAction[] = [];
  let result = normalizeDirectInput(normalizer, {
    source,
    intent: { type: "selectPiece", pieceId: "a" },
  });
  normalizer = result.state;
  intents.push(...result.intents);
  result = normalizeDirectInput(normalizer, {
    source,
    intent: { type: "placePiece", pieceId: "a" },
  });
  intents.push(...result.intents);
  return intents;
}

function dragPlacement(): BridgeIntentAction[] {
  let normalizer = createInputNormalizerState(null, 1);
  const intents: BridgeIntentAction[] = [];
  for (const event of [
    {
      phase: "down" as const,
      targetPieceId: "a",
      overGap: false,
      generation: 1,
    },
    {
      phase: "move" as const,
      targetPieceId: "a",
      overGap: false,
      generation: 1,
    },
    {
      phase: "up" as const,
      targetPieceId: null,
      overGap: true,
      generation: 1,
    },
  ]) {
    const result = normalizePointerEvent(normalizer, event);
    normalizer = result.state;
    intents.push(...result.intents);
  }
  return intents;
}

describe("GAME-132 representative Phaser vertical slice", () => {
  it("proves drag, tap/click, and keyboard converge on identical engine intents/results", () => {
    const drag = dragPlacement();
    const tap = directPlacement("tap");
    const keyboard = directPlacement("keyboard");

    expect(drag).toEqual([
      { type: "selectPiece", pieceId: "a" },
      { type: "placePiece", pieceId: "a" },
    ]);
    expect(tap).toEqual(drag);
    expect(keyboard).toEqual(drag);

    for (const intents of [drag, tap, keyboard]) {
      const state = applyAll(intents);
      expect(state.placed.map((piece) => piece.id)).toEqual(["a"]);
      expect(filledUnitsOf(state)).toBe(4);
      expect(state.phase).toBe("building");
    }
  });

  it("renders authoritative underfill feedback after Check it", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "submit" }).state;

    const vm = deriveBridgeViewModel(state);
    const semantic = deriveBridgeSemanticState(state, vm);
    expect(state.phase).toBe("incorrectSubmit");
    expect(vm.verdict).toBe("underfill");
    expect(semantic.verdict).toBe("underfill");
    expect(semantic.difference).toBe("Remaining 6");
    expect(semantic.feedback).toContain("Remaining 6");
  });

  it("renders authoritative overfill/overhang feedback without committing the rejected piece", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "d" }).state;

    const vm = deriveBridgeViewModel(state);
    const semantic = deriveBridgeSemanticState(state, vm);
    expect(state.lastOutcome?.status).toBe("overhang");
    expect(state.lastOutcome?.diff).toBe(1);
    expect(state.placed.map((piece) => piece.id)).toEqual(["a"]);
    expect(filledUnitsOf(state)).toBe(4);
    expect(vm.verdict).toBe("overfill");
    expect(semantic.verdict).toBe("overfill");
    expect(semantic.difference).toBe("Over by 1");
  });

  it("completes an exact bridge before decorative crossing and preserves math under reduced motion", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" }).state;
    expect(state.phase).toBe("exact");

    const crossing = deriveBridgeViewModel(state, {
      crossing: true,
      reducedMotion: false,
    });
    const reduced = deriveBridgeViewModel(state, {
      crossing: false,
      reducedMotion: true,
    });
    const crossingSemantic = deriveBridgeSemanticState(state, crossing);
    const reducedSemantic = deriveBridgeSemanticState(state, reduced);

    expect(crossing.filledUnits).toBe(10);
    expect(crossing.verdict).toBe("exact");
    expect(crossingSemantic.completion).toBe("crossing");
    expect(reduced.filledUnits).toBe(crossing.filledUnits);
    expect(reduced.verdict).toBe(crossing.verdict);
    expect(reduced.remainingSpan).toBe(0);
    expect(reducedSemantic.completion).toBe("complete");
    expect(reduced.activeStates).toContain("reducedMotion");
  });

  it("keeps authoritative state invariant across phone, tablet, desktop, and DPR changes", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;

    const presentations = [
      deriveBridgeViewModel(state, {
        layout: createBridgeLayout({ canvasWidth: 390, canvasHeight: 360, dpr: 1 }),
      }),
      deriveBridgeViewModel(state, {
        layout: createBridgeLayout({ canvasWidth: 820, canvasHeight: 480, dpr: 2 }),
      }),
      deriveBridgeViewModel(state, {
        layout: createBridgeLayout({ canvasWidth: 1100, canvasHeight: 620, dpr: 3 }),
      }),
    ];

    expect(presentations.map((vm) => vm.responsive)).toEqual([
      "phone",
      "tablet",
      "desktop",
    ]);
    expect(presentations.map((vm) => vm.filledUnits)).toEqual([4, 4, 4]);
    expect(presentations.map((vm) => vm.remainingSpan)).toEqual([6, 6, 6]);
    expect(presentations.map((vm) => vm.verdict)).toEqual([
      "underfill",
      "underfill",
      "underfill",
    ]);
  });

  it("exposes the semantic facts required for the representative bridge", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "selectPiece", pieceId: "a" }).state;
    const selected = deriveBridgeSemanticState(state, deriveBridgeViewModel(state));
    expect(selected.selectedPiece).toBe("4 (4 units)");
    expect(selected.target).toBe("10 (10 units)");
    expect(selected.composition).toBe("empty = 0 units");
    expect(selected.availableActions).toContain("place selected");

    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    const partial = deriveBridgeSemanticState(state, deriveBridgeViewModel(state));
    expect(partial.composition).toBe("4 = 4 units");
    expect(partial.difference).toBe("Remaining 6");
    expect(partial.verdict).toBe("underfill");
  });
});
