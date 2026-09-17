/**
 * Normalize pointer/drag/tap events into bounded Bridge intents.
 * Uses a monotonic inputGeneration so stale remount/tween callbacks cannot double-place.
 */

import type { BridgeIntent } from "../intents";

export type PointerPhase = "down" | "move" | "up" | "cancel";

export interface BridgePointerEvent {
  phase: PointerPhase;
  /** Stable piece id under the pointer, if any. */
  targetPieceId: string | null;
  /** True when the pointer is over the gap/span hit target. */
  overGap: boolean;
  /** Host generation token captured when the gesture began. */
  generation: number;
}

export interface InputNormalizerState {
  inputGeneration: number;
  selectedPieceId: string | null;
  draggingPieceId: string | null;
  dragStarted: boolean;
}

export interface NormalizeResult {
  state: InputNormalizerState;
  intents: BridgeIntent[];
}

export function createInputNormalizerState(
  selectedPieceId: string | null = null,
  inputGeneration = 1
): InputNormalizerState {
  return {
    inputGeneration,
    selectedPieceId,
    draggingPieceId: null,
    dragStarted: false,
  };
}

export function bumpInputGeneration(state: InputNormalizerState): InputNormalizerState {
  return {
    ...state,
    inputGeneration: state.inputGeneration + 1,
    draggingPieceId: null,
    dragStarted: false,
  };
}

/**
 * Convert a pointer event into zero or more bounded intents.
 * Events whose generation does not match the current token are ignored.
 */
export function normalizePointerEvent(
  state: InputNormalizerState,
  event: BridgePointerEvent
): NormalizeResult {
  if (event.generation !== state.inputGeneration) {
    return { state, intents: [] };
  }

  if (event.phase === "cancel") {
    return {
      state: {
        ...state,
        draggingPieceId: null,
        dragStarted: false,
      },
      intents: [],
    };
  }

  if (event.phase === "down") {
    if (!event.targetPieceId) {
      return { state, intents: [] };
    }
    const intents: BridgeIntent[] = [];
    let selectedPieceId = state.selectedPieceId;
    if (event.targetPieceId !== state.selectedPieceId) {
      selectedPieceId = event.targetPieceId;
      intents.push({ type: "selectPiece", pieceId: event.targetPieceId });
    }
    return {
      state: {
        ...state,
        selectedPieceId,
        draggingPieceId: event.targetPieceId,
        dragStarted: false,
      },
      intents,
    };
  }

  if (event.phase === "move") {
    if (!state.draggingPieceId) return { state, intents: [] };
    return {
      state: { ...state, dragStarted: true },
      intents: [],
    };
  }

  // phase === "up"
  if (!state.draggingPieceId) {
    // Tap-place: selected piece + tap on gap (no active drag).
    if (event.overGap && state.selectedPieceId) {
      return {
        state,
        intents: [{ type: "placePiece", pieceId: state.selectedPieceId }],
      };
    }
    return { state, intents: [] };
  }

  const pieceId = state.draggingPieceId;
  const wasDrag = state.dragStarted;
  const next: InputNormalizerState = {
    ...state,
    draggingPieceId: null,
    dragStarted: false,
  };

  if (event.overGap) {
    return {
      state: next,
      intents: [{ type: "placePiece", pieceId }],
    };
  }

  // Tap-select without drag and without gap: keep selection only.
  if (!wasDrag && event.targetPieceId === pieceId) {
    return { state: { ...next, selectedPieceId: pieceId }, intents: [] };
  }

  return { state: next, intents: [] };
}
