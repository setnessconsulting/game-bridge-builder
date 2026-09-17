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

export function scorePuzzle(input: {
  hintLevelMax: 0 | 1 | 2 | 3;
  secondBuild: boolean;
  /** Number of exact-fit bridges already solved in this session. */
  streakBefore?: number;
}): number {
  const base = input.secondBuild ? 5 : 10;
  const zeroHintBonus = !input.secondBuild && input.hintLevelMax === 0 ? 2 : 0;
  const streakBonus = (input.streakBefore ?? 0) >= 3 ? 1 : 0;
  return base + zeroHintBonus + streakBonus;
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
