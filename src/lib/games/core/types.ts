export type Band = "g12" | "g34" | "g56" | "g78";

export interface RangeSpec {
  min: number;
  max: number;
}

export interface SkillGenPolicy {
  denominator: number;
  gapRange: RangeSpec;
  pieceValues: readonly number[];
  decoys: number;
  parPieces: [number, number];
  ticksVisible: boolean;
  /** Pre-symbolic rendering hint for this skill. */
  face?: "dots";
  /** Pre-symbolic dot-face rendering requested for this skill (g12 tiers). */
  minDistinctSolutions: 1 | 2;
}

export interface SkillDefinition {
  id: string;
  band: Band;
  grades: [number, number];
  ccss: readonly string[];
  genPolicy: SkillGenPolicy;
}

export interface HintRequest {
  level: 1 | 2 | 3;
}

export type TelemetryEventType =
  | "session_start"
  | "puzzle_start"
  | "place_attempt"
  | "hint_shown"
  | "puzzle_solved"
  | "second_build"
  | "streak_update"
  | "session_end"
  | "break_flow"
  | "piece_merge"
  | "piece_split"
  | "plank_lift"
  | "invariant_violation";

export interface TelemetryEvent {
  type: TelemetryEventType;
  ts: number;
  payload: Record<string, unknown>;
}

export type DomainStatus = "strength" | "developing" | "growth-area";

export type LearnerDomain =
  | "number-operations"
  | "fractions-ratios"
  | "geometry-measurement"
  | "algebraic-thinking";

export interface LearnerSignal {
  band: Band;
  third: "early" | "mid" | "late" | null;
  domainStrength: Partial<Record<LearnerDomain, DomainStatus>>;
  recentMasteryDelta?: number;
}

export interface HintContext {
  gapUnits: number;
  filledUnits: number;
  trayValues: readonly number[];
  attempts: number;
  hintLevelShown: 0 | 1 | 2 | 3;
}

export interface HintOutcome {
  level: 1 | 2 | 3;
  message?: string;
  highlightPieceId?: string;
  ghostUnits?: number;
}

export interface TutorAdapter {
  nextHint(context: HintContext, pieces: ReadonlyMap<number, string>): HintOutcome | null;
}

export interface LearnerModelAdapter {
  currentSignal(): LearnerSignal;
  record(events: readonly TelemetryEvent[]): void;
}

export const MAX_SCALED_UNITS = 2 ** 31 - 1;

export const ALL_BANDS: readonly Band[] = ["g12", "g34", "g56", "g78"];

export const BAND_META: Record<Band, { label: string; detail: string }> = {
  g12: { label: "Whole planks", detail: "Fill gaps up to 45 with number planks" },
  g34: {
    label: "Grade 3–4 math",
    detail: "Whole numbers, equal groups, fractions, and decimals — each round can start with any of them",
  },
  g56: { label: "Fractions & decimals", detail: "Unlike denominators, decimal ops, ratios and x-beams" },
  g78: { label: "Algebra beams", detail: "Signed shims, equations with x, diagonal braces" },
};
