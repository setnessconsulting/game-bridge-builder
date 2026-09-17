import { MAX_SCALED_UNITS, type Band, type SkillDefinition } from "@/lib/games/core/types";
import { pickFrom, pickInt, shuffled } from "@/lib/games/core/rng";
import type { BridgePuzzle, Piece } from "./types";
import { SKILLS_BY_BAND, skillById } from "./skills";
import { formatPieceLabel } from "./format";
import { countSubsetSolutions, findSubset } from "./math";

export interface GenerateOptions {
  index?: number;
  sessionX?: number | null;
  /** Within-band knob: easier trims decoys/gaps, harder pushes them up. */
  difficulty?: "easier" | "harder";
}

interface Candidate {
  gapUnits: number;
  trayValues: number[];
  presetPlacedUnits: number;
  legs?: { a: string; b: string };
  sessionX?: number;
  groupSize?: number;
}

interface AdjustedPolicy {
  gapMin: number;
  gapMax: number;
  minSolutions: number;
}

function ensureTraySize(candidate: Candidate): Candidate {
  const trayValues = [...candidate.trayValues];
  let filler = 0;
  while (trayValues.length < 5) {
    // A filler larger than the target cannot be part of a positive exact-fit
    // solution. Keep it four units clear so it cannot pair with a signed
    // shim to become an accidental solution either.
    trayValues.push(candidate.gapUnits + 4 + filler);
    filler += 1;
  }
  return { ...candidate, trayValues };
}

function classifyPiece(units: number, sessionX: number | null): Piece["kind"] {
  if (units < 0) return "shim";
  if (sessionX !== null) {
    if (units === sessionX) return "beam-x";
    if (units === sessionX * 2) return "beam-2x";
    return "strut";
  }
  return "plank";
}

function labelPieces(
  values: readonly number[],
  skill: SkillDefinition,
  sessionX: number | null
): Piece[] {
  return values.map((units, i) => {
    const kind = classifyPiece(units, sessionX);
    return {
      id: `${skill.id}#${i}:${units}`,
      units,
      label: formatPieceLabel(kind, units, skill.genPolicy.denominator),
      kind,
    };
  });
}

function sortedValues(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function samplePartition(
  rng: () => number,
  total: number,
  targetParts: number,
  pool: readonly number[]
): number[] {
  const parts: number[] = [];
  let remaining = total;
  const smallest = Math.min(...pool);
  for (let i = 0; i < targetParts - 1; i += 1) {
    const slotsLeft = targetParts - 1 - i;
    const usable = pool.filter((v) => v <= remaining - smallest * slotsLeft);
    const options = usable.length > 0 ? usable : pool.filter((v) => v <= remaining);
    if (options.length === 0) break;
    const part = pickFrom(rng, options);
    parts.push(part);
    remaining -= part;
  }
  if (remaining > 0) parts.push(remaining);
  return parts.filter((p) => p > 0);
}

function addDecoys(
  rng: () => number,
  parts: number[],
  policy: SkillDefinition["genPolicy"],
  referenceGap: number
): number[] {
  const decoys: number[] = [];
  const largest = Math.max(...policy.pieceValues);
  for (let i = 0; i < policy.decoys; i += 1) {
    if (rng() < 0.3 && referenceGap > largest) {
      decoys.push(referenceGap + pickInt(rng, 1, largest));
    } else {
      decoys.push(pickFrom(rng, policy.pieceValues));
    }
  }
  return [...parts, ...decoys];
}

function buildCompose(rng: () => number, skill: SkillDefinition): Candidate {
  const policy = skill.genPolicy;
  const d = policy.denominator;
  const minGap = Math.ceil(policy.gapRange.min / d) * d;
  const maxGap = Math.floor(policy.gapRange.max / d) * d;
  const gapUnits = pickInt(rng, minGap, maxGap);
  const maxParts = Math.min(
    policy.parPieces[1],
    Math.max(policy.parPieces[0], Math.floor(gapUnits / Math.min(...policy.pieceValues)))
  );
  const targetParts = pickInt(rng, policy.parPieces[0], maxParts);
  const parts = samplePartition(rng, gapUnits, targetParts, policy.pieceValues);
  return {
    gapUnits,
    trayValues: addDecoys(rng, parts, policy, gapUnits),
    presetPlacedUnits: 0,
  };
}

function buildMissingAddend(rng: () => number, skill: SkillDefinition): Candidate {
  const policy = skill.genPolicy;
  const gapUnits = pickInt(rng, policy.gapRange.min, policy.gapRange.max);
  const need = pickInt(rng, 4, Math.min(14, gapUnits - 8));
  const preset = gapUnits - need;
  const parts =
    need <= Math.min(...policy.pieceValues) || rng() < 0.4
      ? [need]
      : samplePartition(rng, need, 2, policy.pieceValues);
  return {
    gapUnits,
    trayValues: addDecoys(rng, parts, policy, need),
    presetPlacedUnits: preset,
  };
}

const FACTOR_PRODUCTS = [12, 16, 18, 20, 24, 30, 36, 40, 42, 48] as const;

function divisorsOf(product: number, pool: readonly number[]): number[] {
  return pool.filter((v) => v > 1 && product % v === 0 && product / v <= 48);
}

function buildFactorPairs(rng: () => number, skill: SkillDefinition): Candidate {
  const policy = skill.genPolicy;
  const product = pickFrom(rng, FACTOR_PRODUCTS);
  const divisors = divisorsOf(product, policy.pieceValues);
  const gapUnits = product;
  let parts: number[];
  if (divisors.length >= 2 && rng() < 0.7) {
    const d = pickFrom(rng, divisors);
    parts = [d, product / d];
  } else {
    parts = samplePartition(rng, product, pickInt(rng, 2, 3), policy.pieceValues);
  }
  const otherDivisorDecoys = divisors.filter((v) => !parts.includes(v)).slice(0, 2);
  const trayValues = shuffled(rng, [
    ...parts,
    ...otherDivisorDecoys,
    ...addDecoys(rng, [], policy, product).slice(0, Math.max(0, policy.decoys - otherDivisorDecoys.length)),
  ]);
  return { gapUnits, trayValues, presetPlacedUnits: 0 };
}

function buildMultGroups(rng: () => number, skill: SkillDefinition): Candidate {
  const v = pickFrom(rng, skill.genPolicy.pieceValues);
  const k = pickInt(rng, 3, 5);
  const gapUnits = v * k;
  const groups = Array.from({ length: k }, () => v);
  return {
    gapUnits,
    trayValues: addDecoys(rng, groups, skill.genPolicy, gapUnits),
    presetPlacedUnits: 0,
    groupSize: v,
  };
}

function buildFractionEquiv(rng: () => number): Candidate {
  const half = 4;
  const quarter = 2;
  const allQuarters = rng() < 0.4;
  const parts = allQuarters
    ? [quarter, quarter, quarter, quarter]
    : [half, quarter, quarter];
  const decoys = [
    pickFrom(rng, [1, 3]),
    pickFrom(rng, [1, 3]),
  ];
  return {
    gapUnits: 8,
    trayValues: shuffled(rng, [...parts, ...decoys]),
    presetPlacedUnits: 0,
  };
}

function buildLinearEq(rng: () => number, skill: SkillDefinition, sessionX: number | null): Candidate | null {
  const x = sessionX ?? pickFrom(rng, [4, 5, 6, 8]);
  const k = pickInt(rng, 2, 3);
  const struts = skill.genPolicy.pieceValues.filter((v) => v !== x && v !== x * 2);
  if (struts.length === 0) return null;
  const { gapRange } = skill.genPolicy;
  const cMin = Math.max(Math.min(...struts), gapRange.min - k * x);
  const cMax = Math.min(12, gapRange.max - k * x);
  if (cMin > cMax) return null;
  const c1 = pickInt(rng, cMin, cMax);
  const gapUnits = k * x + c1;
  const strutParts = samplePartition(rng, c1, pickInt(rng, 1, 2), struts);
  const beams = Array.from({ length: k }, () => x);
  const trayValues = shuffled(rng, [
    ...beams,
    ...strutParts,
    ...struts.filter((v) => v <= Math.max(c1, 6)).slice(0, 2),
  ]);
  return { gapUnits, trayValues, presetPlacedUnits: 0, sessionX: x };
}

function buildRationalEq(rng: () => number, skill: SkillDefinition): Candidate {
  const policy = skill.genPolicy;
  const gapUnits = pickInt(rng, policy.gapRange.min, policy.gapRange.max);
  const parts = samplePartition(rng, gapUnits, pickInt(rng, 2, 3), policy.pieceValues);
  const shimMagnitude = pickInt(rng, 1, 3);
  const shim = -shimMagnitude;
  // Keep the signed-shim teaching path playable: a positive decoy can
  // intentionally overshoot by exactly the available shim amount, while the
  // positive partition remains a clean solution.
  const overshootWitness = gapUnits + shimMagnitude;
  const trayValues = shuffled(rng, [
    ...parts,
    overshootWitness,
    shim,
    ...addDecoys(rng, [], policy, gapUnits),
  ]);
  return { gapUnits, trayValues, presetPlacedUnits: 0 };
}

const PYTHAGOREAN_TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
];

function buildPythagorean(rng: () => number, skill: SkillDefinition): Candidate {
  const [a, b, c] = pickFrom(rng, PYTHAGOREAN_TRIPLES);
  const composeTwo = c > 6 && rng() < 0.5;
  const smaller = Math.min(a, b);
  const parts = composeTwo ? [smaller, c - smaller] : [c];
  const nearMisses = [c + 1, b, a].filter((v) => v > 0 && !parts.includes(v));
  const decoyCount = Math.min(skill.genPolicy.decoys, nearMisses.length);
  const decoys = shuffled(rng, nearMisses).slice(0, decoyCount);
  return {
    gapUnits: c,
    trayValues: shuffled(rng, [...parts, ...decoys]),
    presetPlacedUnits: 0,
    legs: { a: String(a), b: String(b) },
  };
}

function buildCandidate(
  rng: () => number,
  skill: SkillDefinition,
  sessionX: number | null
): Candidate | null {
  switch (skill.id) {
    case "bb-missing-addend":
      return buildMissingAddend(rng, skill);
    case "bb-factor-pairs":
      return buildFactorPairs(rng, skill);
    case "bb-mult-groups":
      return buildMultGroups(rng, skill);
    case "bb-fraction-equiv":
      return buildFractionEquiv(rng);
    case "bb-linear-eq":
      return buildLinearEq(rng, skill, sessionX);
    case "bb-rational-eq":
      return buildRationalEq(rng, skill);
    case "bb-pythagorean-span":
      return buildPythagorean(rng, skill);
    default:
      return buildCompose(rng, skill);
  }
}

export function generatePuzzle(
  skillId: string,
  rng: () => number,
  options: GenerateOptions = {}
): BridgePuzzle {
  const skill = skillById(skillId);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  const policy = skill.genPolicy;
  const requestedX = skill.id === "bb-linear-eq" ? options.sessionX ?? null : null;
  const index = options.index ?? 0;
  const difficulty = options.difficulty;
  // Policy ranges are already expressed in scaled integer units, including
  // denominator-based skills. Do not multiply them a second time.
  const midGap = (policy.gapRange.min + policy.gapRange.max) / 2;
  const adjusted: AdjustedPolicy = {
    gapMin:
      difficulty === "harder"
        ? Math.ceil(midGap / policy.denominator) * policy.denominator
        : policy.gapRange.min,
    gapMax:
      difficulty === "easier"
        ? Math.floor(midGap / policy.denominator) * policy.denominator
        : policy.gapRange.max,
    minSolutions: difficulty === "harder" ? Math.max(2, policy.minDistinctSolutions) : policy.minDistinctSolutions,
  };

  let best: { candidate: Candidate; solutions: number } | null = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const rawCandidate = buildCandidate(rng, skill, requestedX);
    if (!rawCandidate) continue;
    const candidate = ensureTraySize(rawCandidate);
    if (
      candidate.gapUnits < adjusted.gapMin ||
      candidate.gapUnits > adjusted.gapMax
    ) {
      continue;
    }
    const need = candidate.gapUnits - candidate.presetPlacedUnits;
    const traySum = candidate.trayValues.reduce((a, v) => a + v, 0);
    if (need <= 0 || traySum < need) continue;
    if (candidate.gapUnits > MAX_SCALED_UNITS) continue;
    const solutions = countSubsetSolutions(sortedValues(candidate.trayValues), need);
    if (solutions <= 0) continue;
    if (!best || solutions > best.solutions) best = { candidate, solutions };
    if (solutions >= adjusted.minSolutions) break;
  }
  if (!best) throw new Error(`Generator invariant violated for ${skillId}`);

  const candidate = best.candidate;
  const sessionX = skill.id === "bb-linear-eq" ? candidate.sessionX ?? requestedX : null;
  const need = candidate.gapUnits - candidate.presetPlacedUnits;
  const solutions = countSubsetSolutions(sortedValues(candidate.trayValues), need);
  const trayPieces = shuffled(rng, labelPieces(candidate.trayValues, skill, sessionX));
  const presetPieces: Piece[] = candidate.presetPlacedUnits
    ? [
        {
          id: `${skill.id}-preset`,
          units: candidate.presetPlacedUnits,
          label: formatPieceLabel("plank", candidate.presetPlacedUnits, policy.denominator),
          kind: "plank",
        },
      ]
    : [];
  const parSubset = findSubset(sortedValues(candidate.trayValues), need);

  const hasEquivalenceRelation =
    skill.id === "bb-fraction-equiv"
      ? candidate.trayValues.includes(4) &&
        candidate.trayValues.filter((v) => v === 2).length >= 2
      : false;

  return {
    id: `${skillId}#${index}`,
    skillId,
    band: skill.band,
    denominator: policy.denominator,
    gapUnits: candidate.gapUnits,
    gapLabel: formatPieceLabel("plank", candidate.gapUnits, policy.denominator),
    ticksVisible: policy.ticksVisible,
    tray: trayPieces,
    presetPlaced: presetPieces,
    parPieces: parSubset ? parSubset.length : policy.parPieces[0],
    solutionCount: solutions,
    supportsSecondConstruction: solutions >= 2,
    hasEquivalenceRelation,
    groupSize: candidate.groupSize,
    legs: candidate.legs,
    scaleNote:
      skill.id === "bb-ratio-scale"
        ? "Blueprint scale: each square counts double"
        : skill.id === "bb-scale-drawing"
          ? "Scale drawing: 1 square = 3 m"
          : undefined,
  };
}

export function createSessionX(skillId: string, rng: () => number): number | null {
  return skillId === "bb-linear-eq" ? pickFrom(rng, [4, 5, 6, 8]) : null;
}

export interface BuiltRound {
  puzzles: BridgePuzzle[];
  /** Gap labels in round order — used by the target-preview strip (G-08). */
  previewLabels: string[];
}

export function buildRound(
  band: Band,
  rng: () => number,
  options: {
    length?: number;
    biasedSkillIds?: readonly string[];
    difficulty?: "easier" | "harder";
  } = {}
): BuiltRound {
  const length = options.length ?? 6;
  const biased = options.biasedSkillIds ?? [];
  const puzzles: BridgePuzzle[] = [];
  // Shuffle once per round, then cycle the stable order. Re-shuffling for
  // every puzzle can starve a skill entirely, which makes the mixed-skill
  // band promise depend on luck and makes focused browser journeys flaky.
  const skillOrder = orderedSkillsForBand(band, rng, biased);
  let sessionX: number | null = null;
  for (let i = 0; i < length; i += 1) {
    const skill = skillOrder[i % skillOrder.length] as SkillDefinition;
    if (skill.id === "bb-linear-eq" && sessionX === null) {
      sessionX = createSessionX(skill.id, rng);
    }
    puzzles.push(
      generatePuzzle(skill.id, rng, { index: i + 1, sessionX, difficulty: options.difficulty })
    );
  }
  return { puzzles, previewLabels: puzzles.map((p) => p.gapLabel) };
}

export function nextSkillForBand(
  band: Band,
  rng: () => number,
  biasSkillIds: readonly string[] = [],
  rotateIndex = 0
): SkillDefinition {
  const ordered = orderedSkillsForBand(band, rng, biasSkillIds);
  return ordered[rotateIndex % ordered.length] as SkillDefinition;
}

function orderedSkillsForBand(
  band: Band,
  rng: () => number,
  biasSkillIds: readonly string[] = []
): SkillDefinition[] {
  const bandSkills = SKILLS_BY_BAND[band];
  const biased = bandSkills.filter((s) => biasSkillIds.includes(s.id));
  const rest = bandSkills.filter((s) => !biasSkillIds.includes(s.id));
  const ordered = [...shuffled(rng, biased), ...shuffled(rng, rest)];
  return ordered.length > 0 ? ordered : [bandSkills[0] as SkillDefinition];
}
