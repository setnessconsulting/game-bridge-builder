import type { Band } from "@/lib/games/core/types";

export type PieceKind = "plank" | "beam-x" | "beam-2x" | "strut" | "shim" | "brace";

export interface Piece {
  id: string;
  units: number;
  label: string;
  kind: PieceKind;
}

export interface BridgePuzzle {
  id: string;
  skillId: string;
  band: Band;
  denominator: number;
  gapUnits: number;
  gapLabel: string;
  ticksVisible: boolean;
  tray: Piece[];
  presetPlaced: Piece[];
  parPieces: number;
  solutionCount: number;
  supportsSecondConstruction: boolean;
  hasEquivalenceRelation: boolean;
  /** Equal-group size for bb-mult-groups visual grouping (G-10). */
  groupSize?: number;
  legs?: { a: string; b: string };
  scaleNote?: string;
}

export type PlacementStatus = "fit" | "partial" | "overhang" | "overshoot";

export interface PlacementOptions {
  /**
   * When set, an overshoot up to this many units past the gap yields status
   * "overshoot" (recoverable, e.g. by a signed shim) instead of auto-return.
   */
  allowOvershootUpTo?: number;
}

export interface PlacementOutcome {
  status: PlacementStatus;
  diff: number;
  filledAfter: number;
}

export interface AttemptRecord {
  attempts: number;
  hintLevelMax: 0 | 1 | 2 | 3;
  secondBuild: boolean;
  points: number;
}

export interface RoundSummary {
  bridges: number;
  points: number;
  bestStreak: number;
  hintsUsed: number;
  avgAttempts: number;
  coaching: string;
}
