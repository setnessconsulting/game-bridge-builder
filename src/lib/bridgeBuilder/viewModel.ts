/**
 * Typed Bridge Builder view model for Phaser / React presentation.
 * Exact lengths and verdicts are copied from the session; pixels are metadata.
 */

import {
  compositionUnits,
  exactFitVerdict,
  remainingSpanUnits,
  availableTray,
} from "./exactness";
import type { BridgeIntentType } from "./intents";
import {
  bridgeSpanWidthPx,
  createBridgeLayout,
  unitsToPx,
  type BridgeLayoutConfig,
} from "./layout";
import type { BridgeSessionState } from "./session";
import type { Piece, PlacementStatus } from "./types";

export const BRIDGE_VIEW_MODEL_VERSION = "1.0.0" as const;

export type BridgePresentationStateName =
  | "span"
  | "pieces"
  | "pieceTray"
  | "selected"
  | "focused"
  | "dragging"
  | "placementPreview"
  | "placed"
  | "removable"
  | "remainingSpan"
  | "underfill"
  | "overfill"
  | "exact"
  | "incorrectSubmit"
  | "success"
  | "crossing"
  | "environment"
  | "hints"
  | "reducedMotion"
  | "responsive";

export type BridgeResponsiveBucket = "phone" | "tablet" | "desktop";

export interface BridgePieceView {
  id: string;
  /** Authoritative exact length (scaled integer). */
  units: number;
  label: string;
  kind: Piece["kind"];
  /** Presentation metadata only. */
  widthPx: number;
  selected: boolean;
  focused: boolean;
  dragging: boolean;
  removable: boolean;
}

export interface BridgeViewModel {
  version: typeof BRIDGE_VIEW_MODEL_VERSION;
  puzzleId: string;
  skillId: string;
  /** Exact span in scaled units. */
  span: number;
  spanLabel: string;
  denominator: number;
  filledUnits: number;
  remainingSpan: number;
  verdict: "exact" | "underfill" | "overfill" | null;
  lastPlacementStatus: PlacementStatus | null;
  pieceTray: BridgePieceView[];
  placed: BridgePieceView[];
  pieces: BridgePieceView[];
  selectedPieceId: string | null;
  focusedPieceId: string | null;
  draggingPieceId: string | null;
  placementPreviewPieceId: string | null;
  removablePieceIds: string[];
  underfill: boolean;
  overfill: boolean;
  exact: boolean;
  incorrectSubmit: boolean;
  success: boolean;
  /** Post-verdict only; never authoritative. */
  crossing: boolean;
  environment: {
    band: string;
    ticksVisible: boolean;
    scaleNote?: string;
    legs?: { a: string; b: string };
  };
  hints: {
    level: 0 | 1 | 2 | 3;
    message: string | null;
    highlightPieceId: string | null;
    ghostUnits: number | null;
    ghostWidthPx: number | null;
  };
  reducedMotion: boolean;
  responsive: BridgeResponsiveBucket;
  layout: BridgeLayoutConfig;
  spanWidthPx: number;
  presentationGeneration: number;
  /** Active named states for Figma / contract mapping. */
  activeStates: BridgePresentationStateName[];
}

export interface DeriveBridgeViewModelOptions {
  layout?: BridgeLayoutConfig;
  draggingPieceId?: string | null;
  focusedPieceId?: string | null;
  placementPreviewPieceId?: string | null;
  reducedMotion?: boolean;
  crossing?: boolean;
}

function responsiveBucket(width: number): BridgeResponsiveBucket {
  if (width < 600) return "phone";
  if (width < 960) return "tablet";
  return "desktop";
}

function toPieceView(
  piece: Piece,
  layout: BridgeLayoutConfig,
  flags: {
    selected: boolean;
    focused: boolean;
    dragging: boolean;
    removable: boolean;
  }
): BridgePieceView {
  return {
    id: piece.id,
    units: piece.units,
    label: piece.label,
    kind: piece.kind,
    widthPx: unitsToPx(piece.units, layout.unitPx),
    selected: flags.selected,
    focused: flags.focused,
    dragging: flags.dragging,
    removable: flags.removable,
  };
}

export function deriveBridgeViewModel(
  state: BridgeSessionState,
  options: DeriveBridgeViewModelOptions = {}
): BridgeViewModel {
  const layout = options.layout ?? createBridgeLayout();
  const filled = compositionUnits(state.puzzle, state.placed);
  const remaining = remainingSpanUnits(state.puzzle, state.placed);
  const placementOverfill =
    state.lastOutcome?.status === "overhang" ||
    state.lastOutcome?.status === "overshoot";
  const verdict =
    state.phase === "exact"
      ? "exact"
      : placementOverfill
        ? "overfill"
        : state.phase === "incorrectSubmit"
          ? exactFitVerdict(state.puzzle.gapUnits, filled)
          : state.lastOutcome
            ? exactFitVerdict(state.puzzle.gapUnits, filled)
            : null;

  const tray = availableTray(state.tray, state.placed);
  const draggingPieceId = options.draggingPieceId ?? null;
  const focusedPieceId = options.focusedPieceId ?? state.selectedPieceId;
  const placementPreviewPieceId = options.placementPreviewPieceId ?? null;

  const pieceTray = tray.map((piece) =>
    toPieceView(piece, layout, {
      selected: piece.id === state.selectedPieceId,
      focused: piece.id === focusedPieceId,
      dragging: piece.id === draggingPieceId,
      removable: false,
    })
  );
  const placed = state.placed.map((piece) =>
    toPieceView(piece, layout, {
      selected: false,
      focused: piece.id === focusedPieceId,
      dragging: false,
      removable: state.phase === "building",
    })
  );

  const exact = state.phase === "exact" || verdict === "exact";
  const underfill = remaining > 0 && !exact;
  const overfill =
    placementOverfill ||
    (verdict === "overfill" && state.phase === "incorrectSubmit");
  const incorrectSubmit = state.phase === "incorrectSubmit";
  const success = exact;
  const crossing = Boolean(options.crossing) && success;
  const reducedMotion = options.reducedMotion ?? false;
  const responsive = responsiveBucket(layout.canvasWidth);

  const activeStates: BridgePresentationStateName[] = [
    "span",
    "pieces",
    "pieceTray",
    "placed",
    "remainingSpan",
    "environment",
    "hints",
    "responsive",
  ];
  if (state.selectedPieceId) activeStates.push("selected");
  if (focusedPieceId) activeStates.push("focused");
  if (draggingPieceId) activeStates.push("dragging");
  if (placementPreviewPieceId) activeStates.push("placementPreview");
  if (placed.some((p) => p.removable)) activeStates.push("removable");
  if (underfill) activeStates.push("underfill");
  if (overfill) activeStates.push("overfill");
  if (exact) activeStates.push("exact", "success");
  if (incorrectSubmit) activeStates.push("incorrectSubmit");
  if (crossing) activeStates.push("crossing");
  if (reducedMotion) activeStates.push("reducedMotion");

  return {
    version: BRIDGE_VIEW_MODEL_VERSION,
    puzzleId: state.puzzle.id,
    skillId: state.puzzle.skillId,
    span: state.puzzle.gapUnits,
    spanLabel: state.puzzle.gapLabel,
    denominator: state.puzzle.denominator,
    filledUnits: filled,
    remainingSpan: remaining,
    verdict,
    lastPlacementStatus: state.lastOutcome?.status ?? null,
    pieceTray,
    placed,
    pieces: [...placed, ...pieceTray],
    selectedPieceId: state.selectedPieceId,
    focusedPieceId,
    draggingPieceId,
    placementPreviewPieceId,
    removablePieceIds: placed.filter((p) => p.removable).map((p) => p.id),
    underfill,
    overfill,
    exact,
    incorrectSubmit,
    success,
    crossing,
    environment: {
      band: state.puzzle.band,
      ticksVisible: state.puzzle.ticksVisible,
      scaleNote: state.puzzle.scaleNote,
      legs: state.puzzle.legs,
    },
    hints: {
      level: state.hintLevel,
      message: state.lastHintMessage,
      highlightPieceId: state.highlightPieceId,
      ghostUnits: state.ghostUnits,
      ghostWidthPx:
        state.ghostUnits === null ? null : unitsToPx(state.ghostUnits, layout.unitPx),
    },
    reducedMotion,
    responsive,
    layout,
    spanWidthPx: bridgeSpanWidthPx(state.puzzle.gapUnits, layout),
    presentationGeneration: state.presentationGeneration,
    activeStates,
  };
}

/** Intents the renderer is allowed to emit. */
export const RENDERER_ALLOWED_INTENTS: readonly BridgeIntentType[] = [
  "selectPiece",
  "placePiece",
  "removePiece",
  "reset",
  "submit",
  "requestHint",
  "continue",
  "presentationComplete",
] as const;
