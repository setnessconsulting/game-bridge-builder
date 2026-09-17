import type { Band, LearnerSignal, LearnerDomain, DomainStatus } from "@/lib/games/core/types";
import { skillIdsForDomain } from "./skills";
import { bandForGrade } from "./format";

export interface PlacementBandLike {
  grade: number;
  third: "early" | "mid" | "late";
}

export interface PlacementResultLike {
  band: PlacementBandLike | null;
  signals?: ReadonlyArray<{ domain: string; status: DomainStatus }>;
}

export interface RoundConfig {
  band: Band;
  third: "early" | "mid" | "late" | null;
  biasedSkillIds: string[];
}

export type WithinBandDifficulty = "easier" | "harder" | undefined;

/** Map the placement third to the generator's within-band pressure knob. */
export function difficultyForThird(
  third: RoundConfig["third"]
): WithinBandDifficulty {
  if (third === "early") return "easier";
  if (third === "late") return "harder";
  return undefined;
}

export function signalFromPlacement(pr: PlacementResultLike | null): LearnerSignal {
  if (!pr || !pr.band) {
    return { band: "g12", third: null, domainStrength: {} };
  }
  const domainStrength: Partial<Record<LearnerDomain, DomainStatus>> = {};
  for (const s of pr.signals ?? []) {
    if (
      s.domain === "number-operations" ||
      s.domain === "fractions-ratios" ||
      s.domain === "geometry-measurement" ||
      s.domain === "algebraic-thinking"
    ) {
      domainStrength[s.domain] = s.status;
    }
  }
  return {
    band: bandForGrade(pr.band.grade),
    third: pr.band.third,
    domainStrength,
  };
}

export function buildRoundConfig(signal: LearnerSignal): RoundConfig {
  const biased = new Set<string>();
  for (const [domain, status] of Object.entries(signal.domainStrength) as ReadonlyArray<
    [LearnerDomain, DomainStatus | undefined]
  >) {
    if (status === "growth-area" || status === "developing") {
      for (const id of skillIdsForDomain(domain)) biased.add(id);
    }
  }
  return {
    band: signal.band,
    third: signal.third,
    biasedSkillIds: [...biased],
  };
}

export function configFromPlacement(pr: PlacementResultLike | null): RoundConfig {
  return buildRoundConfig(signalFromPlacement(pr));
}

export function shouldSuggestEasier(stuckPuzzleRun: number): boolean {
  return stuckPuzzleRun >= 3;
}

export function easierBand(band: Band): Band | null {
  switch (band) {
    case "g78":
      return "g56";
    case "g56":
      return "g34";
    case "g34":
      return "g12";
    default:
      return null;
  }
}
