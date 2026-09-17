import { describe, expect, it } from "vitest";
import { BRIDGE_INTENT_TYPES } from "@/lib/bridgeBuilder/intents";
import {
  createBridgeLayout,
  pxToLayoutUnits,
  unitsToPx,
  withResize,
} from "@/lib/bridgeBuilder/layout";
import {
  applyBridgeIntent,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import {
  BRIDGE_VIEW_MODEL_VERSION,
  RENDERER_ALLOWED_INTENTS,
  deriveBridgeViewModel,
} from "@/lib/bridgeBuilder/viewModel";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

const puzzle: BridgePuzzle = {
  id: "vm#1",
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

describe("GAME-130 view model contract", () => {
  it("maps session exact values and presentation metadata without recomputing correctness", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "selectPiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    const layout = createBridgeLayout({ unitPx: 24, canvasWidth: 800 });
    const vm = deriveBridgeViewModel(state, {
      layout,
      draggingPieceId: null,
      focusedPieceId: "b",
    });

    expect(vm.version).toBe(BRIDGE_VIEW_MODEL_VERSION);
    expect(vm.span).toBe(10);
    expect(vm.filledUnits).toBe(4);
    expect(vm.remainingSpan).toBe(6);
    expect(vm.underfill).toBe(true);
    expect(vm.overfill).toBe(false);
    expect(vm.exact).toBe(false);
    expect(vm.pieceTray.some((p) => p.id === "a")).toBe(false);
    expect(vm.placed[0]?.units).toBe(4);
    expect(vm.placed[0]?.widthPx).toBe(96);
    expect(vm.focusedPieceId).toBe("b");
    expect(vm.activeStates).toContain("underfill");
    expect(vm.activeStates).toContain("remainingSpan");
    expect(vm.responsive).toBe("tablet");
  });

  it("keeps pixel conversion at the view boundary", () => {
    expect(unitsToPx(5, 24)).toBe(120);
    expect(unitsToPx(-2, 24)).toBe(48);
    expect(pxToLayoutUnits(120, 24)).toBe(5);
    const layout = createBridgeLayout({ unitPx: 12 });
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" }).state;
    const small = deriveBridgeViewModel(state, { layout });
    const large = deriveBridgeViewModel(state, {
      layout: createBridgeLayout({ unitPx: 48 }),
    });
    expect(small.filledUnits).toBe(large.filledUnits);
    expect(small.exact).toBe(true);
    expect(large.exact).toBe(true);
    expect(small.placed[0]?.widthPx).not.toBe(large.placed[0]?.widthPx);
  });

  it("resize/DPR changes layout only", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    const before = deriveBridgeViewModel(state, {
      layout: createBridgeLayout({ canvasWidth: 400, dpr: 1 }),
    });
    const after = deriveBridgeViewModel(state, {
      layout: withResize(before.layout, { width: 1200, height: 700, dpr: 2 }),
    });
    expect(after.filledUnits).toBe(before.filledUnits);
    expect(after.remainingSpan).toBe(before.remainingSpan);
    expect(after.responsive).toBe("desktop");
    expect(after.layout.dpr).toBe(2);
  });

  it("exposes an exhaustive closed intent allowlist", () => {
    expect([...RENDERER_ALLOWED_INTENTS].sort()).toEqual([...BRIDGE_INTENT_TYPES].sort());
  });

  it("marks crossing as post-verdict success-only metadata", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" }).state;
    const without = deriveBridgeViewModel(state, { crossing: false });
    const withCrossing = deriveBridgeViewModel(state, { crossing: true });
    expect(without.crossing).toBe(false);
    expect(withCrossing.crossing).toBe(true);
    expect(withCrossing.activeStates).toContain("crossing");
    expect(withCrossing.filledUnits).toBe(without.filledUnits);
  });
});
