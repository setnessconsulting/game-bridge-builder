import { mulberry32 } from "@/lib/games/core/rng";
import { BRIDGE_MAX_BRIDGES } from "./exactness";
import { formatScaled } from "./format";
import { generatePuzzle } from "./generate";
import type { BridgePuzzle } from "./types";

const QUALIFICATION_SKILL = "bb-compose-10";
const GENERATION_ATTEMPTS = 128;

/**
 * A display-independent identity for a math question. Puzzle IDs and piece
 * ordering are intentionally excluded so a reshuffle cannot disguise a repeat.
 */
export function qualificationQuestionKey(puzzle: BridgePuzzle): string {
  const piecesKey = (pieces: BridgePuzzle["tray"]) =>
    pieces
      .map((piece) => `${piece.kind}:${piece.units}`)
      .sort()
      .join(",");

  return [
    puzzle.skillId,
    puzzle.denominator,
    puzzle.gapUnits,
    piecesKey(puzzle.presetPlaced),
    piecesKey(puzzle.tray),
  ].join("|");
}

function labelSpan(puzzle: BridgePuzzle): string {
  const value = formatScaled(puzzle.gapUnits, puzzle.denominator);
  const unit = Math.abs(puzzle.gapUnits) === puzzle.denominator ? "unit" : "units";
  return `${value} ${unit}`;
}

/**
 * Build the six-question qualification round. The first load can retain the
 * fixed vertical-slice puzzle; subsequent prompts use a different target and
 * a fresh piece set, so the same math question cannot appear back-to-back.
 */
export function createQualificationRound(
  seed: number,
  options: { firstPuzzle?: BridgePuzzle; previousPuzzle?: BridgePuzzle } = {},
): BridgePuzzle[] {
  const puzzles: BridgePuzzle[] = options.firstPuzzle ? [options.firstPuzzle] : [];
  const rng = mulberry32(seed);
  const seen = new Set<string>();

  if (options.previousPuzzle) {
    seen.add(qualificationQuestionKey(options.previousPuzzle));
  }
  for (const puzzle of puzzles) seen.add(qualificationQuestionKey(puzzle));

  let previousGap = options.firstPuzzle?.gapUnits ?? options.previousPuzzle?.gapUnits;

  while (puzzles.length < BRIDGE_MAX_BRIDGES) {
    let generated: BridgePuzzle | null = null;

    for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt += 1) {
      const questionNumber = puzzles.length + 1;
      const candidate = generatePuzzle(QUALIFICATION_SKILL, rng, { index: questionNumber });
      const questionKey = qualificationQuestionKey(candidate);
      if (seen.has(questionKey) || candidate.gapUnits === previousGap) continue;

      generated = {
        ...candidate,
        id: `qualification-${seed}-bridge-${questionNumber}`,
        gapLabel: labelSpan(candidate),
      };
      seen.add(questionKey);
      break;
    }

    if (!generated) {
      throw new Error(`Could not generate a new qualification question for ${QUALIFICATION_SKILL}`);
    }

    puzzles.push(generated);
    previousGap = generated.gapUnits;
  }

  return puzzles;
}
