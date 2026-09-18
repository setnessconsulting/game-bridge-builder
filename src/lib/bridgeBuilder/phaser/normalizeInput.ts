/**
 * Normalize pointer/drag/tap/keyboard input into bounded Bridge intents.
 * Presentation input may choose an intent, but only the engine may decide
 * whether the intent is legal or mathematically correct.
 */

import type { BridgeIntent } from "../intents";

export type PointerPhase = "down" | "move" | "up" | "cancel";
export type BridgeDirectInputSource = "tap" | "keyboard";

export interface BridgePointerEvent {
  phase: PointerPhase;
  /** Stable tray piece id under the pointer, if any. */
  targetPieceId: string | null;
  /** True when the pointer is over the gap/span hit target. */
  overGap: boolean;
  /** Host generation token captured when the gesture began. */
  generation: number;
}

export interface BridgeDirectInput {
  source: BridgeDirectInputSource;
  intent: BridgeIntent;
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
    selectedPieceId: null,
    draggingPieceId: null,
    dragStarted: false,
  };
}

/**
 * Tap/click and keyboard controls both pass through this direct normalizer.
 * The source is retained for tests/diagnostics only; the resulting engine
 * intent is deliberately identical for equivalent actions.
 */
export function normalizeDirectInput(
  state: InputNormalizerState,
  input: BridgeDirectInput
): NormalizeResult {
  void input.source;
  const intent = input.intent;
  let next = {
    ...state,
    draggingPieceId: null,
    dragStarted: false,
  };

  switch (intent.type) {
    case "selectPiece":
      next = { ...next, selectedPieceId: intent.pieceId };
      break;
    case "placePiece":
    case "reset":
      next = { ...next, selectedPieceId: null };
      break;
    case "removePiece":
      if (next.selectedPieceId === intent.pieceId) {
        next = { ...next, selectedPieceId: null };
      }
      break;
    default:
      break;
  }

  return { state: next, intents: [intent] };
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
        state: { ...state, selectedPieceId: null },
        intents: [{ type: "placePiece", pieceId: state.selectedPieceId }],
      };
    }
    return { state, intents: [] };
  }

  const pieceId = state.draggingPieceId;
  const wasDrag = state.dragStarted;
  const next: InputNormalizerState = {
    ...state,
    selectedPieceId: event.overGap ? null : state.selectedPieceId,
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
