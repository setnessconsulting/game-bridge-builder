/**
 * Exactness helpers for Bridge Builder scaled-integer arithmetic.
 *
 * The authoritative "rational" contract is: every length is an integer count of
 * 1/denominator units. Two compositions are equal iff their unit totals are
 * equal. Floating-point pixels, snap tolerances, and physics never participate.
 */

import type { BridgePuzzle, Piece } from "./types";

/** Session limits frozen for free/break modes (sandbox may ignore the clock). */
export const BRIDGE_SESSION_SECONDS = 90;
export const BRIDGE_MAX_BRIDGES = 6;
export const BRIDGE_BEST_STORAGE_KEY = "levelbest.bridge-builder.best";

export function presetFilledUnits(puzzle: Pick<BridgePuzzle, "presetPlaced">): number {
  return puzzle.presetPlaced.reduce((sum, piece) => sum + piece.units, 0);
}

export function placedUnits(placed: readonly Piece[]): number {
  return placed.reduce((sum, piece) => sum + piece.units, 0);
}

export function compositionUnits(
  puzzle: Pick<BridgePuzzle, "presetPlaced">,
  placed: readonly Piece[]
): number {
  return presetFilledUnits(puzzle) + placedUnits(placed);
}

export function remainingSpanUnits(
  puzzle: Pick<BridgePuzzle, "gapUnits" | "presetPlaced">,
  placed: readonly Piece[]
): number {
  return puzzle.gapUnits - compositionUnits(puzzle, placed);
}

/**
 * Invariant: sum of exact piece lengths equals the authoritative composition.
 * Independent of screen size, sprite width, drag location, and snap animation.
 */
export function assertCompositionExact(
  puzzle: Pick<BridgePuzzle, "presetPlaced">,
  placed: readonly Piece[],
  authoritativeFilledUnits: number
): boolean {
  return compositionUnits(puzzle, placed) === authoritativeFilledUnits;
}

/**
 * Verdicts are integer equality only. A renderer-supplied snapTolerancePx or
 * unitPx must never change this result.
 */
export function exactFitVerdict(
  gapUnits: number,
  filledUnits: number,
  _rendererNoise?: { unitPx?: number; snapTolerancePx?: number }
): "exact" | "underfill" | "overfill" {
  void _rendererNoise;
  if (filledUnits === gapUnits) return "exact";
  if (filledUnits < gapUnits) return "underfill";
  return "overfill";
}

export function availableTray(
  tray: readonly Piece[],
  placed: readonly Piece[]
): Piece[] {
  const placedIds = new Set(placed.map((piece) => piece.id));
  return tray.filter((piece) => !placedIds.has(piece.id)).sort((a, b) => a.units - b.units);
}

export function maxShimAbs(tray: readonly Piece[]): number {
  return tray.reduce(
    (max, piece) => (piece.units < 0 ? Math.max(max, Math.abs(piece.units)) : max),
    0
  );
}
