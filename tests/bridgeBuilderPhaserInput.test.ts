import { describe, expect, it } from "vitest";
import {
  bumpInputGeneration,
  createInputNormalizerState,
  normalizePointerEvent,
} from "@/lib/bridgeBuilder/phaser/normalizeInput";

describe("GAME-131 Phaser input normalization", () => {
  it("emits select then place on drag-to-gap", () => {
    let state = createInputNormalizerState(null, 1);
    let result = normalizePointerEvent(state, {
      phase: "down",
      targetPieceId: "a",
      overGap: false,
      generation: 1,
    });
    expect(result.intents).toEqual([{ type: "selectPiece", pieceId: "a" }]);
    state = result.state;

    result = normalizePointerEvent(state, {
      phase: "move",
      targetPieceId: "a",
      overGap: false,
      generation: 1,
    });
    expect(result.intents).toEqual([]);
    state = result.state;
    expect(state.dragStarted).toBe(true);

    result = normalizePointerEvent(state, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 1,
    });
    expect(result.intents).toEqual([{ type: "placePiece", pieceId: "a" }]);
    expect(result.state.draggingPieceId).toBeNull();
  });

  it("places a piece when a tray tap ends on the same piece", () => {
    let state = createInputNormalizerState(null, 2);
    let result = normalizePointerEvent(state, {
      phase: "down",
      targetPieceId: "a",
      overGap: false,
      generation: 2,
    });
    expect(result.intents).toEqual([{ type: "selectPiece", pieceId: "a" }]);
    state = result.state;

    result = normalizePointerEvent(state, {
      phase: "up",
      targetPieceId: "a",
      overGap: false,
      generation: 2,
    });
    expect(result.intents).toEqual([{ type: "placePiece", pieceId: "a" }]);
    expect(result.state.selectedPieceId).toBeNull();
  });

  it("treats a selected piece followed by a gap tap as place without drag", () => {
    const state = createInputNormalizerState("a", 2);
    const result = normalizePointerEvent(state, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 2,
    });
    expect(result.intents).toEqual([{ type: "placePiece", pieceId: "a" }]);
  });

  it("ignores stale generation tokens after remount", () => {
    let state = createInputNormalizerState(null, 1);
    state = normalizePointerEvent(state, {
      phase: "down",
      targetPieceId: "a",
      overGap: false,
      generation: 1,
    }).state;
    state = bumpInputGeneration(state);
    expect(state.inputGeneration).toBe(2);
    expect(state.draggingPieceId).toBeNull();

    const stale = normalizePointerEvent(state, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 1,
    });
    expect(stale.intents).toEqual([]);
  });

  it("drops duplicate pointerup after place clears drag", () => {
    let state = createInputNormalizerState(null, 3);
    state = normalizePointerEvent(state, {
      phase: "down",
      targetPieceId: "b",
      overGap: false,
      generation: 3,
    }).state;
    state = normalizePointerEvent(state, {
      phase: "move",
      targetPieceId: "b",
      overGap: true,
      generation: 3,
    }).state;
    const first = normalizePointerEvent(state, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 3,
    });
    expect(first.intents).toEqual([{ type: "placePiece", pieceId: "b" }]);
    expect(first.state.selectedPieceId).toBeNull();
    const second = normalizePointerEvent(first.state, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 3,
    });
    expect(second.intents).toEqual([]);

    const afterCommit = bumpInputGeneration(first.state);
    const staleDup = normalizePointerEvent(afterCommit, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 3,
    });
    expect(staleDup.intents).toEqual([]);
  });

  it("cancels an in-flight drag without placing", () => {
    let state = createInputNormalizerState(null, 4);
    state = normalizePointerEvent(state, {
      phase: "down",
      targetPieceId: "c",
      overGap: false,
      generation: 4,
    }).state;
    const cancelled = normalizePointerEvent(state, {
      phase: "cancel",
      targetPieceId: "c",
      overGap: false,
      generation: 4,
    });
    expect(cancelled.intents).toEqual([]);
    expect(cancelled.state.draggingPieceId).toBeNull();
  });
});
