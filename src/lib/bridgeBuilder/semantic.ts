import { formatDiff } from "./engine";
import type { BridgeSessionState } from "./session";
import type { BridgeViewModel } from "./viewModel";

export type BridgeSemanticVerdict =
  | "building"
  | "underfill"
  | "overfill"
  | "exact";

export interface BridgeSemanticState {
  selectedPiece: string;
  composition: string;
  target: string;
  difference: string;
  verdict: BridgeSemanticVerdict;
  feedback: string;
  completion: "incomplete" | "crossing" | "complete";
  availableActions: string[];
}

/**
 * One semantic projection shared by the visible DOM companion and tests.
 * It formats authoritative session/view-model facts; it never decides
 * correctness independently of the engine.
 */
export function deriveBridgeSemanticState(
  state: BridgeSessionState,
  vm: BridgeViewModel
): BridgeSemanticState {
  const allPlaced = [...state.puzzle.presetPlaced, ...state.placed];
  const selected = state.tray.find((piece) => piece.id === state.selectedPieceId);
  const composition =
    allPlaced.length === 0
      ? `empty = ${formatDiff(vm.filledUnits, vm.denominator)}`
      : `${allPlaced.map((piece) => piece.label).join(" + ")} = ${formatDiff(
          vm.filledUnits,
          vm.denominator
        )}`;

  const placementOverfill =
    state.lastOutcome?.status === "overhang" ||
    state.lastOutcome?.status === "overshoot";

  let verdict: BridgeSemanticVerdict = "building";
  if (vm.exact) verdict = "exact";
  else if (placementOverfill || vm.verdict === "overfill") verdict = "overfill";
  else if (state.lastOutcome || state.phase === "incorrectSubmit") verdict = "underfill";

  const difference =
    verdict === "exact"
      ? "Exact: 0"
      : verdict === "overfill"
        ? `Over by ${formatDiff(
            placementOverfill && state.lastOutcome
              ? state.lastOutcome.diff
              : Math.abs(Math.min(0, vm.remainingSpan)),
            vm.denominator
          )}`
        : `Remaining ${formatDiff(
            Math.max(0, vm.remainingSpan),
            vm.denominator
          )}`;

  let feedback = "Choose a piece, then place it on the span.";
  if (verdict === "exact") {
    feedback = vm.crossing
      ? "Exact fit. The load marker is crossing the completed bridge."
      : "Exact fit. The bridge is complete.";
  } else if (verdict === "overfill") {
    feedback = `${difference}. Choose a shorter combination and try again.`;
  } else if (state.phase === "incorrectSubmit") {
    feedback = `${difference}. Add more length before checking again.`;
  } else if (verdict === "underfill") {
    feedback = `${difference}. Keep building.`;
  }

  const availableActions =
    verdict === "exact"
      ? []
      : [
          "select a piece",
          "place selected",
          ...(state.placed.length > 0 ? ["remove a placed piece"] : []),
          "reset",
          "check it",
          ...(state.phase === "incorrectSubmit" ? ["keep building"] : []),
        ];

  return {
    selectedPiece: selected ? `${selected.label} (${selected.units} units)` : "none",
    composition: `${composition} units`,
    target: `${vm.spanLabel} (${formatDiff(vm.span, vm.denominator)} units)`,
    difference,
    verdict,
    feedback,
    completion: vm.exact ? (vm.crossing ? "crossing" : "complete") : "incomplete",
    availableActions,
  };
}
