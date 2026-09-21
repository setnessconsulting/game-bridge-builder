import { describe, expect, it } from "vitest";
import { previewPlacementFit } from "@/lib/bridgeBuilder/engine";
import {
  applyBridgeIntent,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import {
  tooLongForCopy,
  tooLongShortCopy,
} from "@/lib/bridgeBuilder/oversizeTeach";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

const puzzle: BridgePuzzle = {
  id: "oversize-302",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10 units",
  ticksVisible: true,
  tray: [
    { id: "plank-4", units: 4, label: "4-unit plank", kind: "plank" },
    { id: "plank-6", units: 6, label: "6-unit plank", kind: "plank" },
    { id: "plank-3", units: 3, label: "3-unit plank", kind: "plank" },
    { id: "plank-7", units: 7, label: "7-unit plank", kind: "plank" },
    { id: "plank-5", units: 5, label: "5-unit plank", kind: "plank" },
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 2,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

describe("GAME-302 engine authority for oversize", () => {
  it("flags only true overhangs via previewPlacementFit", () => {
    // Fresh span: 10 left, 7 fits as partial, not overhang.
    expect(previewPlacementFit(puzzle, 0, 7).wouldOverhang).toBe(false);
    expect(previewPlacementFit(puzzle, 0, 7).remaining).toBe(10);
    // After 7 placed: 3 left, 5 exceeds by 2.
    const over = previewPlacementFit(puzzle, 7, 5);
    expect(over.wouldOverhang).toBe(true);
    expect(over.remaining).toBe(3);
    expect(over.excess).toBe(2);
    expect(over.status).toBe("overhang");
    // Exact fit never oversized.
    expect(previewPlacementFit(puzzle, 7, 3).wouldOverhang).toBe(false);
    expect(previewPlacementFit(puzzle, 7, 3).status).toBe("fit");
    // Negative shims never oversized.
    expect(previewPlacementFit(puzzle, 12, -2).wouldOverhang).toBe(false);
  });

  it("respects recoverable shim allowance instead of flagging overshoot", () => {
    const withShim = { gapUnits: 10 };
    // 1 past the gap with a -2 shim available is overshoot, not overhang.
    const soft = previewPlacementFit(withShim, 10, 1, { allowOvershootUpTo: 2 });
    expect(soft.status).toBe("overshoot");
    expect(soft.wouldOverhang).toBe(false);
    // Same placement without shim cover is a hard overhang.
    const hard = previewPlacementFit(withShim, 10, 1);
    expect(hard.status).toBe("overhang");
    expect(hard.wouldOverhang).toBe(true);
  });
});

describe("GAME-302 teach copy names the remaining span", () => {
  it("short copy says too long for N left", () => {
    expect(tooLongShortCopy(3, 1)).toBe("Too long for 3 units left");
    expect(tooLongShortCopy(1, 1)).toBe("Too long for 1 unit left");
  });

  it("full copy teaches remaining + excess + shorter-plank action", () => {
    const copy = tooLongForCopy({
      pieceLabel: "5-unit plank",
      remaining: 3,
      excess: 2,
      denominator: 1,
    });
    expect(copy).toContain("too long for");
    expect(copy).toContain("3 units left");
    expect(copy).toContain("stick out by 2 units");
    expect(copy).toContain("shorter");
  });
});

describe("GAME-302 viewModel oversized affordance", () => {
  it("dims only planks that exceed the remaining span", () => {
    let state = createBridgeSession(puzzle);
    let vm = deriveBridgeViewModel(state);
    // Fresh 10-span: nothing exceeds, no dimming.
    expect(vm.oversizedPieceIds).toEqual([]);
    expect(vm.pieceTray.every((p) => !p.oversized)).toBe(true);

    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-7" }).state;
    vm = deriveBridgeViewModel(state);
    expect(vm.remainingSpan).toBe(3);
    // 4,5,6 exceed 3 left; 3 fits exactly.
    expect(vm.oversizedPieceIds.sort()).toEqual(["plank-4", "plank-5", "plank-6"].sort());
    const byId = new Map(vm.pieceTray.map((p) => [p.id, p]));
    expect(byId.get("plank-5")?.oversized).toBe(true);
    expect(byId.get("plank-5")?.excessUnits).toBe(2);
    expect(byId.get("plank-3")?.oversized).toBe(false);
    expect(byId.get("plank-3")?.excessUnits).toBeNull();
  });

  it("exposes selected + hover preview metadata for geometry preview", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-7" }).state;
    state = applyBridgeIntent(state, { type: "selectPiece", pieceId: "plank-5" }).state;
    const vm = deriveBridgeViewModel(state, { placementPreviewPieceId: "plank-6" });
    expect(vm.selectedOversize).toMatchObject({ remaining: 3, excessUnits: 2 });
    expect(vm.previewOversize).toMatchObject({
      pieceId: "plank-6",
      remaining: 3,
      excessUnits: 3,
    });
  });

  it("clears oversize flags when the span is closed or exact", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-4" }).state;
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-6" }).state;
    const vm = deriveBridgeViewModel(state);
    expect(vm.exact).toBe(true);
    expect(vm.oversizedPieceIds).toEqual([]);
    expect(vm.selectedOversize).toBeNull();
    expect(vm.previewOversize).toBeNull();
  });
});

describe("GAME-302 refused place is never a silent no-op", () => {
  it("overhang attempt returns announce + cue + overhang outcome", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-7" }).state;
    const attemptsBefore = state.attempts;
    const result = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-5" });
    // Engine rejects with overhang math.
    expect(result.state.lastOutcome?.status).toBe("overhang");
    expect(result.state.lastOutcome?.diff).toBe(2);
    expect(result.state.lastOverhang).toMatchObject({ label: "5-unit plank" });
    // Refusal is observable: attempts + failedPlacements move, effects announce.
    expect(result.state.attempts).toBe(attemptsBefore + 1);
    expect(result.state.failedPlacements).toBeGreaterThan(0);
    const announce = result.effects.find((e) => e.type === "announce");
    expect(announce).toBeDefined();
    expect((announce as { text: string }).text).toContain("too long");
    const cue = result.effects.find((e) => e.type === "cue");
    expect(cue).toMatchObject({ cue: "overhang" });
    // Piece is not placed — composition unchanged.
    expect(result.state.placed.map((p) => p.id)).toEqual(["plank-7"]);
  });
});
