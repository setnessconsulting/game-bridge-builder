import type { Band, SkillDefinition } from "@/lib/games/core/types";

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  {
    id: "bb-compose-10",
    band: "g12",
    grades: [1, 1],
    ccss: ["1.OA.C.6", "1.OA.D.8"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 6, max: 10 },
      pieceValues: [1, 2, 3, 4, 5],
      decoys: 2,
      parPieces: [2, 3],
      ticksVisible: true,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-compose-20",
    band: "g12",
    grades: [1, 2],
    ccss: ["1.OA.D.8", "2.OA.B.2"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 11, max: 20 },
      pieceValues: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      decoys: 2,
      parPieces: [2, 3],
      ticksVisible: false,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-missing-addend",
    band: "g12",
    grades: [2, 2],
    ccss: ["2.NBT.B.5"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 22, max: 45 },
      pieceValues: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      decoys: 2,
      parPieces: [1, 2],
      ticksVisible: false,
      minDistinctSolutions: 1,
    },
  },
  {
    id: "bb-factor-pairs",
    band: "g34",
    grades: [3, 3],
    ccss: ["3.OA.C.7", "3.OA.A.4", "4.OA.A.4"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 12, max: 48 },
      pieceValues: [2, 3, 4, 5, 6, 8, 9, 10, 12],
      decoys: 3,
      parPieces: [2, 3],
      ticksVisible: false,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-mult-groups",
    band: "g34",
    grades: [3, 4],
    ccss: ["3.OA.A.1", "3.OA.A.4", "3.OA.C.7"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 12, max: 48 },
      pieceValues: [3, 4, 5, 6, 7, 8],
      decoys: 2,
      parPieces: [3, 5],
      ticksVisible: false,
      minDistinctSolutions: 1,
    },
  },
  {
    id: "bb-fraction-equiv",
    band: "g34",
    grades: [3, 4],
    ccss: ["3.NF.A.3", "4.NF.A.1"],
    genPolicy: {
      denominator: 8,
      gapRange: { min: 8, max: 8 },
      pieceValues: [1, 2, 3, 4],
      decoys: 2,
      parPieces: [2, 4],
      ticksVisible: true,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-decimals-tenths",
    band: "g34",
    grades: [4, 4],
    ccss: ["4.NF.C.5", "4.NF.C.6"],
    genPolicy: {
      denominator: 10,
      gapRange: { min: 50, max: 100 },
      pieceValues: [10, 20, 30, 40, 50],
      decoys: 2,
      parPieces: [2, 3],
      ticksVisible: false,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-unlike-denom",
    band: "g56",
    grades: [5, 5],
    ccss: ["5.NF.A.1"],
    genPolicy: {
      denominator: 24,
      gapRange: { min: 24, max: 48 },
      pieceValues: [4, 6, 8, 9, 12, 16],
      decoys: 2,
      parPieces: [2, 4],
      ticksVisible: true,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-decimal-ops",
    band: "g56",
    grades: [5, 5],
    ccss: ["5.NBT.B.7"],
    genPolicy: {
      denominator: 100,
      gapRange: { min: 300, max: 900 },
      pieceValues: [50, 75, 100, 125, 150, 200, 250, 300],
      decoys: 2,
      parPieces: [2, 3],
      ticksVisible: false,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-ratio-scale",
    band: "g56",
    grades: [6, 6],
    ccss: ["6.RP.A.3"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 6, max: 24 },
      pieceValues: [2, 3, 4, 5, 6, 8, 9, 10, 12],
      decoys: 2,
      parPieces: [2, 3],
      ticksVisible: false,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-linear-eq",
    band: "g56",
    grades: [6, 6],
    ccss: ["6.EE.B.5", "6.EE.B.6"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 14, max: 30 },
      pieceValues: [2, 3, 4, 5, 6, 7, 8],
      decoys: 2,
      parPieces: [3, 5],
      ticksVisible: false,
      minDistinctSolutions: 1,
    },
  },
  {
    id: "bb-rational-eq",
    band: "g78",
    grades: [7, 7],
    ccss: ["7.EE.B.4", "7.NS.A.1d"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 25, max: 60 },
      pieceValues: [5, 6, 7, 8, 9, 10, 12, 15],
      decoys: 2,
      parPieces: [3, 5],
      ticksVisible: false,
      minDistinctSolutions: 1,
    },
  },
  {
    id: "bb-scale-drawing",
    band: "g78",
    grades: [7, 8],
    ccss: ["7.G.A.1"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 12, max: 36 },
      pieceValues: [3, 4, 5, 6, 8, 9, 10, 12],
      decoys: 2,
      parPieces: [2, 3],
      ticksVisible: false,
      minDistinctSolutions: 2,
    },
  },
  {
    id: "bb-pythagorean-span",
    band: "g78",
    grades: [8, 8],
    ccss: ["8.G.B.7"],
    genPolicy: {
      denominator: 1,
      gapRange: { min: 5, max: 17 },
      pieceValues: [3, 4, 5, 6, 8, 10, 12, 13, 15, 17],
      decoys: 2,
      parPieces: [1, 3],
      ticksVisible: false,
      minDistinctSolutions: 1,
    },
  },
];

export const SKILLS_BY_BAND: Record<Band, readonly SkillDefinition[]> = {
  g12: SKILL_DEFINITIONS.filter((s) => s.band === "g12"),
  g34: SKILL_DEFINITIONS.filter((s) => s.band === "g34"),
  g56: SKILL_DEFINITIONS.filter((s) => s.band === "g56"),
  g78: SKILL_DEFINITIONS.filter((s) => s.band === "g78"),
};

export function skillById(id: string): SkillDefinition | undefined {
  return SKILL_DEFINITIONS.find((s) => s.id === id);
}

const DOMAIN_SKILL_PREFIXES = {
  "number-operations": ["bb-compose", "bb-factor", "bb-mult", "bb-missing"],
  "fractions-ratios": ["bb-fraction", "bb-decimal", "bb-unlike", "bb-ratio"],
  "geometry-measurement": ["bb-pythagorean", "bb-ratio"],
  "algebraic-thinking": ["bb-linear", "bb-rational"],
} as const;

export function skillIdsForDomain(
  domain: keyof typeof DOMAIN_SKILL_PREFIXES
): string[] {
  const prefixes = DOMAIN_SKILL_PREFIXES[domain];
  return SKILL_DEFINITIONS.filter((s) =>
    prefixes.some((p) => s.id.startsWith(p))
  ).map((s) => s.id);
}
