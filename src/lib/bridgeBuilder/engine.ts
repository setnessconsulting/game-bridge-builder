import type { AttemptRecord, BridgePuzzle, PlacementOptions, PlacementOutcome, RoundSummary } from "./types";
import { formatScaled } from "./format";

export function evaluatePlacement(
  puzzle: Pick<BridgePuzzle, "gapUnits">,
  filledUnits: number,
  pieceUnits: number,
  options: PlacementOptions = {}
): PlacementOutcome {
  const filledAfter = filledUnits + pieceUnits;
  if (filledAfter === puzzle.gapUnits) {
    return { status: "fit", diff: 0, filledAfter };
  }
  if (filledAfter > puzzle.gapUnits) {
    const excess = filledAfter - puzzle.gapUnits;
    const cap = options.allowOvershootUpTo ?? 0;
    if (excess <= cap) {
      return { status: "overshoot", diff: excess, filledAfter };
    }
    return { status: "overhang", diff: excess, filledAfter };
  }
  return { status: "partial", diff: puzzle.gapUnits - filledAfter, filledAfter };
}

export function starsFor(input: {
  piecesUsed: number;
  par: number;
  hintLevelMax: 0 | 1 | 2 | 3;
}): 1 | 2 | 3 {
  const withinPar = input.piecesUsed <= input.par;
  if (withinPar && input.hintLevelMax === 0) return 3;
  if (withinPar || input.hintLevelMax === 0) return 2;
  return 1;
}

export function mergePieceValues(a: number, b: number, cap: number): number | null {
  const sum = a + b;
  if (sum <= 0 || sum > cap) return null;
  return sum;
}

export function splitPieceValue(units: number): [number, number] | null {
  if (units < 2) return null;
  const left = Math.floor(units / 2);
  return [left, units - left];
}

/**
 * GAME-306: engine-owned second-construction scoring table (UX MAJ-22 /
 * PRD Q-22). Both the bonus and the offer rule live here — never in UI copy.
 *
 * - Bonus: a second (alternate-fill) construction scores `+5` (base).
 * - Offer rate: at most every 3rd solved bridge (`bridgesSolved % 3 === 0`,
 *   i.e. ~33% long-run) may offer, so the measured offer share over solvable
 *   multi-solution puzzles stays `<= 40%` (Q-10 / Q-22). The host additionally
 *   suppresses the card at round end and inside the earned break, which can
 *   only lower the measured rate further.
 */
export const SECOND_BUILD_POINTS = 5;
export const SECOND_BUILD_OFFER_MODULUS = 3;
export const SECOND_BUILD_OFFER_RATE_MAX = 0.4;

export function scorePuzzle(input: {
  hintLevelMax: 0 | 1 | 2 | 3;
  secondBuild: boolean;
  /** Number of exact-fit bridges already solved in this session. */
  streakBefore?: number;
}): number {
  const base = input.secondBuild ? SECOND_BUILD_POINTS : 10;
  const zeroHintBonus = !input.secondBuild && input.hintLevelMax === 0 ? 2 : 0;
  const streakBonus = (input.streakBefore ?? 0) >= 3 ? 1 : 0;
  return base + zeroHintBonus + streakBonus;
}

/**
 * GAME-306: engine-authoritative second-construction offer rule.
 * `bridgesSolved` is the count AFTER the just-completed solve (1-indexed).
 * Returns true only for solvable multi-solution puzzles on the capped share.
 * Host-level suppression (round end, earned break) is applied by the caller
 * via `canShowSecondOffer` — it is not part of this puzzle-level rule.
 */
export function shouldOfferSecondBuild(input: {
  solutionCount: number;
  supportsSecondConstruction: boolean;
  secondActive: boolean;
  bridgesSolved: number;
}): boolean {
  if (input.secondActive) return false;
  if (!input.supportsSecondConstruction) return false;
  if (input.solutionCount < 2) return false;
  if (input.bridgesSolved <= 0) return false;
  return input.bridgesSolved % SECOND_BUILD_OFFER_MODULUS === 0;
}

/**
 * GAME-306: host-level suppression for the second-construction card.
 * Never shown at round end (`expired` or bridge cap reached) and never inside
 * the earned break — even when the puzzle-level rule above returns true.
 */
export function canShowSecondOffer(input: {
  offered: boolean;
  expired: boolean;
  capReached: boolean;
  isBreak: boolean;
}): boolean {
  if (!input.offered) return false;
  if (input.isBreak) return false;
  if (input.expired || input.capReached) return false;
  return true;
}

export function summarizeRound(records: readonly AttemptRecord[]): RoundSummary {
  const bridges = records.length;
  let points = 0;
  let hintsUsed = 0;
  let attemptsTotal = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const r of records) {
    points += r.points;
    hintsUsed += r.hintLevelMax > 0 ? 1 : 0;
    attemptsTotal += r.attempts;
    // Every record is an exact fit. Hints teach rather than breaking the
    // accuracy streak, and a second construction is still a solved bridge.
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
  }
  const avgAttempts = bridges === 0 ? 0 : attemptsTotal / bridges;
  return {
    bridges,
    points,
    bestStreak,
    hintsUsed,
    avgAttempts,
    coaching: coachingFor(bridges, points, bestStreak, hintsUsed, avgAttempts),
  };
}

export function coachingFor(
  bridges: number,
  _points: number,
  bestStreak: number,
  hintsUsed: number,
  avgAttempts: number
): string {
  void _points;
  if (bridges === 0) return "Every try teaches your hands how numbers fit.";
  if (bestStreak >= 3 && hintsUsed === 0) return "First-try fits again and again — strong number sense.";
  if (bestStreak >= 3) return "Exact fits are stacking up — strong number sense.";
  if (hintsUsed === 0) return "No hints needed. Try building one a different way next round.";
  if (avgAttempts <= 2) return "Quick, careful building. Notice which lengths team up well.";
  return "You kept adjusting until it fit exactly — that is how builders think.";
}

export function formatDiff(units: number, denominator: number): string {
  return formatScaled(units, denominator);
}

/**
 * GAME-302: engine-authoritative oversize check for tray affordances.
 * Presentation must call this (never duplicate gap arithmetic) to decide
 * whether a plank exceeds the remaining span before commit.
 *
 * - `remaining` is gapUnits - filledUnits (may be <= 0 once closed/overfilled).
 * - `excess` is how far past the gap this placement would land (>0 only when
 *   filledAfter > gapUnits).
 * - `wouldOverhang` is true exactly when evaluatePlacement would reject with
 *   status "overhang" (i.e. excess beyond any recoverable shim allowance).
 * Negative shims never count as oversized.
 */
export interface OversizePreview {
  remaining: number;
  excess: number;
  filledAfter: number;
  status: PlacementOutcome["status"];
  wouldOverhang: boolean;
}

export function previewPlacementFit(
  puzzle: Pick<BridgePuzzle, "gapUnits">,
  filledUnits: number,
  pieceUnits: number,
  options: PlacementOptions = {}
): OversizePreview {
  const outcome = evaluatePlacement(puzzle, filledUnits, pieceUnits, options);
  const remaining = puzzle.gapUnits - filledUnits;
  const excess = outcome.filledAfter > puzzle.gapUnits ? outcome.filledAfter - puzzle.gapUnits : 0;
  return {
    remaining,
    excess,
    filledAfter: outcome.filledAfter,
    status: outcome.status,
    wouldOverhang: outcome.status === "overhang",
  };
}
